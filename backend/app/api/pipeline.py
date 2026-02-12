from fastapi import APIRouter, HTTPException
import time
from app.schemas.video import VideoRequest
from app.services.transcript_service import generate_transcript
from app.services.section_service import generate_sections
from app.services.notes_service import generate_notes_for_sections
from app.services.revision_service import generate_revision_from_notes
from app.services.embedding_service import create_embeddings_for_sections

router = APIRouter()


@router.post("/process-video")
def process_video(req: VideoRequest):
    """
    Main Noteflix pipeline

    Steps:
    1) Transcript extraction
    2) Section generation
    3) Notes generation (LLM)
    4) Revision material
    5) Embeddings for chat/search
    """

    try:
        start = time.time()
        print("\n🚀 PIPELINE START")

        # ---------------------------------------------------
        # OPTIONS FROM FRONTEND
        # ---------------------------------------------------
        options = req.options or {}
        depth = options.get("depth", "Concise")
        format_type = options.get("format", "Bullet Points")
        tone = options.get("tone", "Academic")

        print("⚙️ User Options:")
        print("   Depth:", depth)
        print("   Format:", format_type)
        print("   Tone:", tone)

        # ---------------------------------------------------
        # 1️⃣ TRANSCRIPT
        # ---------------------------------------------------
        t0 = time.time()
        data = generate_transcript(req.url)
        print("⏱️ Transcript:", round(time.time() - t0, 2), "sec")

        # ---------------------------------------------------
        # 2️⃣ SECTIONS
        # ---------------------------------------------------
        t0 = time.time()
        sections = generate_sections(
            data["transcript"],
            data["metadata"]
        )
        print("⏱️ Sections:", round(time.time() - t0, 2), "sec")

        # ---------------------------------------------------
        # 3️⃣ NOTES (LLM)
        # pass user customization here ⭐
        # ---------------------------------------------------
        t0 = time.time()
        notes = generate_notes_for_sections(
            sections,
            depth=depth,
            format_type=format_type,
            tone=tone
        )
        print("⏱️ Notes:", round(time.time() - t0, 2), "sec")

        # ---------------------------------------------------
        # 4️⃣ REVISION MATERIAL
        # ---------------------------------------------------
        t0 = time.time()
        revision = generate_revision_from_notes(notes)
        print("⏱️ Revision:", round(time.time() - t0, 2), "sec")

        # ---------------------------------------------------
        # 5️⃣ EMBEDDINGS (for chat later)
        # ---------------------------------------------------
        t0 = time.time()
        embeddings = create_embeddings_for_sections(sections)
        print("⏱️ Embeddings:", round(time.time() - t0, 2), "sec")

        total_time = round(time.time() - start, 2)
        print("✅ TOTAL TIME:", total_time, "sec")

        # ---------------------------------------------------
        # RESPONSE TO FRONTEND
        # ---------------------------------------------------
        return {
            "status": "success",
            "processing_time": total_time,
            "metadata": data["metadata"],
            "sections": sections,
            "notes": notes,
            "revision": revision,
            "embeddings_created": True
        }

    except Exception as e:
        print("❌ PIPELINE ERROR:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline failed: {str(e)}"
        )
