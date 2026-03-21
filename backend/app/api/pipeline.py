from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import time
import json
import asyncio
from app.schemas.video import VideoProcessRequest, VideoRequest, CaptureFrameRequest
from app.services.transcript_service import generate_transcript, get_video_metadata
from app.services.section_service import generate_sections
from app.services.notes_service import generate_notes_for_sections
from app.services.embedding_service import create_embeddings_for_sections
from app.services.visual_service import capture_specific_frame

router = APIRouter()

@router.get("/preview-video")
async def preview_video_get():
    return {"message": "You reached /preview-video via GET. This confirms connectivity, but this endpoint requires a POST request from the frontend."}

@router.post("/preview-video")
async def preview_video(req: VideoRequest):
    """
    Fetch video metadata + chapters for the preview step.
    """
    print(f"DEBUG: Processing preview for URL: {req.url}")
    try:
        data = get_video_metadata(req.url)
        print(f"DEBUG: Preview data generated: {data.get('title')}")
        return data
    except Exception as e:
        import traceback
        err = f"PREVIEW ERROR: {str(e)}\n{traceback.format_exc()}"
        print(err)
        raise HTTPException(status_code=400, detail=err)

@router.post("/capture-frame")
async def capture_frame(req: CaptureFrameRequest):
    """
    Captures a specific frame from the video.
    """
    try:
        
        url = await asyncio.to_thread(
            capture_specific_frame, req.url, req.video_id, req.timestamp
        )
        if not url:
            raise HTTPException(status_code=500, detail="Failed to capture frame")
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/process-video")
async def process_video_get():
    return {"message": "You reached /process-video via GET. This confirms connectivity, but this endpoint requires a POST request from the frontend."}

@router.post("/process-video")
async def process_video(req: VideoProcessRequest):
    """
    Main Noteflix pipeline (Streaming SSE)
    """

    async def event_generator():
        try:
            start = time.time()
            yield json.dumps({"status": "starting", "message": "Initializing pipeline..."}) + "\n"

            depth = req.depth
            format_type = req.format
            tone = req.tone
            language = req.language

            yield json.dumps({"status": "transcribing", "message": "Extracting transcript (this may take a moment)..."}) + "\n"
            await asyncio.sleep(0.1) 

            t0 = time.time()
            
            data = generate_transcript(req.url) 
            yield json.dumps({"status": "transcribing_done", "message": "Transcript extracted"}) + "\n"

            yield json.dumps({"status": "processing_sections", "message": "Preparing sections..."}) + "\n"
            
            sections = await generate_sections(
                data["transcript"],
                data["metadata"],
                selected_ranges=req.selected_chapters
            )
            yield json.dumps({"status": "sections_done", "message": f"Prepared {len(sections)} sections", "sections_count": len(sections)}) + "\n"

            yield json.dumps({
                "status": "metadata_ready",
                "metadata": data["metadata"],
                "transcript": data["transcript"]
            }) + "\n"

            visual_resources = [] 

            yield json.dumps({"status": "generating_notes", "message": "Generating notes..."}) + "\n"

            async def process_and_stream_section(section, index):
                from app.services.llm_service import generate_section_notes_with_title
                max_attempts = 8  
                
                for attempt in range(max_attempts):
                    try:
                        
                        section_visuals = [
                            v for v in visual_resources 
                            if section["start"] <= v["timestamp"] <= section["end"]
                        ]

                        result = await generate_section_notes_with_title(
                            section["text"],
                            section.get("title", ""),
                            depth, format_type, tone, language,
                            include_visuals=req.include_visuals,
                            include_code=req.include_code,
                            visual_resources=section_visuals
                        )
                        
                        if not isinstance(result, dict):
                            raise ValueError(f"Invalid result type: {type(result)}")
                        
                        note_item = {
                            "title": result.get("title", section.get("title", "Untitled")),
                            "summary": result.get("summary", ""),
                            "start": section["start"],
                            "end": section["end"],
                            "notes": {
                                "explanation": result.get("explanation", "") or "",
                                "bullet_notes": result.get("bullet_notes", []) or [],
                                "examples": result.get("examples", []) or [],
                                "key_concepts": result.get("key_concepts", []) or [],
                                "difficulty": result.get("difficulty", "Intermediate")
                            }
                        }
                        if attempt > 0:
                            print(f"✅ Section '{section.get('title', 'section')}' succeeded on attempt {attempt + 1}")
                        return (index, note_item)
                    except Exception as e:
                        error_msg = str(e)
                        print(f"❌ Error for section '{section.get('title', 'section')}' (attempt {attempt + 1}/{max_attempts}): {error_msg}")
                        
                        if attempt < max_attempts - 1:
                            wait_time = min(5 * (2 ** attempt), 60)  
                            print(f"🔄 Retrying '{section.get('title', 'section')}' in {wait_time}s...")
                            await asyncio.sleep(wait_time)

                import traceback
                print(f"⚠️ All attempts exhausted for '{section.get('title', 'section')}'")
                print(f"   Traceback: {traceback.format_exc()}")
                note_item = {
                    "title": section.get("title", "Untitled"),
                    "summary": "",
                    "start": section["start"],
                    "end": section["end"],
                    "notes": {
                        "explanation": "This section could not be generated. Please try again.",
                        "bullet_notes": [],
                        "examples": [],
                        "key_concepts": [],
                        "difficulty": "Unknown"
                    }
                }
                return (index, note_item)

            tasks = [process_and_stream_section(s, i) for i, s in enumerate(sections)]
            notes = [None] * len(sections)
            next_index = 0  
            completed_results = {}  

            for coro in asyncio.as_completed(tasks):
                index, note_item = await coro
                notes[index] = note_item
                completed_results[index] = note_item

                while next_index in completed_results:
                    yield json.dumps({
                        "status": "note_ready",
                        "note": completed_results[next_index],
                        "index": next_index,
                        "total": len(sections)
                    }) + "\n"
                    del completed_results[next_index]
                    next_index += 1
            
            yield json.dumps({"status": "notes_done", "message": "Notes generated"}) + "\n"

            yield json.dumps({"status": "creating_embeddings", "message": "Preparing for AI chat..."}) + "\n"
            embeddings = create_embeddings_for_sections(sections)

            total_time = round(time.time() - start, 2)

            final_data = {
                "status": "success",
                "processing_time": total_time,
                "metadata": data["metadata"],
                "sections": sections,
                "notes": notes,
                "transcript": data["transcript"],
                "embeddings_created": True
            }
            yield json.dumps({"status": "complete", "data": final_data}) + "\n"

        except Exception as e:
            print(f"❌ Pipeline Error: {e}")
            yield json.dumps({"status": "error", "message": f"PIPELINE_ERROR: {str(e)}"}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")

from pydantic import BaseModel

class ExtrasRequest(BaseModel):
    notes_text: str
    language: str = "English"
    seed: int = 0
    count: int = 5
    existing_items: list[str] = []

@router.post("/generate-quiz")
async def api_generate_quiz(req: ExtrasRequest):
    """
    Generate UNIQUE MCQ questions from notes.
    """
    from app.services.llm_service import generate_quiz
    try:
        data = await generate_quiz(req.notes_text, req.language, seed=req.seed, existing_items=req.existing_items)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-flashcards")
async def api_generate_flashcards(req: ExtrasRequest):
    """
    Generate unique flashcards from notes.
    """
    from app.services.llm_service import generate_flashcards
    try:
        data = await generate_flashcards(req.notes_text, req.language, count=req.count, seed=req.seed, existing_items=req.existing_items)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-interview")
async def api_generate_interview(req: ExtrasRequest):
    """
    Generate unique interview questions with answers from notes.
    """
    from app.services.llm_service import generate_interview_questions
    try:
        data = await generate_interview_questions(req.notes_text, req.language, count=req.count, seed=req.seed, existing_items=req.existing_items)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
