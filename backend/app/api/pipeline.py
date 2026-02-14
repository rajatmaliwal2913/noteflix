
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import time
import json
import asyncio
from app.schemas.video import VideoProcessRequest, VideoRequest
from app.services.transcript_service import generate_transcript, get_video_metadata
from app.services.section_service import generate_sections
from app.services.notes_service import generate_notes_for_sections
from app.services.embedding_service import create_embeddings_for_sections

router = APIRouter()


@router.post("/preview-video")
async def preview_video(req: VideoRequest):
    """
    Fetch video metadata + chapters for the preview step.
    """
    try:
        data = get_video_metadata(req.url)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/process-video")
async def process_video(req: VideoProcessRequest):
    """
    Main Noteflix pipeline (Streaming SSE)
    """

    async def event_generator():
        try:
            start = time.time()
            yield json.dumps({"status": "starting", "message": "Initializing pipeline..."}) + "\n"

            # ---------------------------------------------------
            # OPTIONS
            # ---------------------------------------------------
            depth = req.depth
            format_type = req.format
            tone = req.tone
            language = req.language

            # ---------------------------------------------------
            # 1️⃣ TRANSCRIPT
            # ---------------------------------------------------
            yield json.dumps({"status": "transcribing", "message": "Extracting transcript (this may take a moment)..."}) + "\n"
            await asyncio.sleep(0.1) # efficient yield

            t0 = time.time()
            # Still blocking, but user sees 'Transcribing'
            data = generate_transcript(req.url) 
            yield json.dumps({"status": "transcribing_done", "message": "Transcript extracted"}) + "\n"
            
            # ---------------------------------------------------
            # 2️⃣ SECTIONS (Use YouTube chapters directly - no AI title generation)
            # ---------------------------------------------------
            yield json.dumps({"status": "processing_sections", "message": "Preparing sections..."}) + "\n"
            
            sections = await generate_sections(
                data["transcript"],
                data["metadata"],
                selected_ranges=req.selected_chapters
            )
            yield json.dumps({"status": "sections_done", "message": f"Prepared {len(sections)} sections", "sections_count": len(sections)}) + "\n"

            # Send metadata and transcript immediately for display
            yield json.dumps({
                "status": "metadata_ready",
                "metadata": data["metadata"],
                "transcript": data["transcript"]
            }) + "\n"

            # ---------------------------------------------------
            # 3️⃣ NOTES (Generate with title in one call, stream as ready)
            # ---------------------------------------------------
            yield json.dumps({"status": "generating_notes", "message": "Generating notes..."}) + "\n"
            
            # Stream notes as they're generated
            async def process_and_stream_section(section, index):
                from app.services.llm_service import generate_section_notes_with_title
                try:
                    result = await generate_section_notes_with_title(
                        section["text"],
                        section.get("title", ""),
                        depth, format_type, tone, language,
                        include_visuals=req.include_visuals,
                        include_code=req.include_code
                    )
                    # Validate result structure
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
                    return (index, note_item)
                except Exception as e:
                    import traceback
                    error_msg = str(e)
                    print(f"❌ Error generating note for '{section.get('title', 'section')}': {error_msg}")
                    print(f"   Traceback: {traceback.format_exc()}")
                    
                    # Return fallback structure with section title
                    note_item = {
                        "title": section.get("title", "Untitled"),
                        "summary": f"Note generation failed: {error_msg[:100]}",
                        "start": section["start"],
                        "end": section["end"],
                        "notes": {
                            "explanation": f"Unable to generate notes for this section. Error: {error_msg[:200]}",
                            "bullet_notes": [],
                            "examples": [],
                            "key_concepts": [],
                            "difficulty": "Unknown"
                        }
                    }
                    return (index, note_item)
            
            # Process all sections in parallel and stream results as they complete
            tasks = [process_and_stream_section(s, i) for i, s in enumerate(sections)]
            notes = [None] * len(sections)
            next_index = 0  # Track next expected index for ordered streaming
            completed_results = {}  # Store completed results by index
            
            # Stream notes as they complete, but maintain order
            for coro in asyncio.as_completed(tasks):
                index, note_item = await coro
                notes[index] = note_item
                completed_results[index] = note_item
                
                # Stream notes in order (wait for next expected index)
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

            # ---------------------------------------------------
            # 4️⃣ EMBEDDINGS (for search/chat - lightweight, non-blocking)
            # ---------------------------------------------------
            yield json.dumps({"status": "creating_embeddings", "message": "Preparing for AI chat..."}) + "\n"
            embeddings = create_embeddings_for_sections(sections)

            total_time = round(time.time() - start, 2)
            
            # ---------------------------------------------------
            # FINAL PAYLOAD
            # ---------------------------------------------------
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
            yield json.dumps({"status": "error", "message": str(e)}) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


from pydantic import BaseModel

class ExtrasRequest(BaseModel):
    notes_text: str
    language: str = "English"
    seed: int = 0
    count: int = 5

@router.post("/generate-quiz")
async def api_generate_quiz(req: ExtrasRequest):
    """
    Generate 5 MCQ questions from notes.
    """
    from app.services.llm_service import generate_quiz
    try:
        data = await generate_quiz(req.notes_text, req.language, seed=req.seed)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-flashcards")
async def api_generate_flashcards(req: ExtrasRequest):
    """
    Generate flashcards from notes.
    """
    from app.services.llm_service import generate_flashcards
    try:
        data = await generate_flashcards(req.notes_text, req.language, count=req.count, seed=req.seed)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-tldr")
async def api_generate_tldr(req: ExtrasRequest):
    """
    Generate TLDR summary from notes.
    """
    from app.services.llm_service import generate_tldr
    try:
        data = await generate_tldr(req.notes_text, req.language)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

