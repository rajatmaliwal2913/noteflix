from fastapi import APIRouter
import time
from app.schemas.video import VideoRequest
from app.services.transcript_service import generate_transcript
from app.services.section_service import generate_sections
from app.services.notes_service import generate_notes_for_sections
from app.services.revision_service import generate_revision_from_notes
from app.services.embedding_service import create_embeddings_for_sections

router = APIRouter()


@router.post("/process-video")


@router.post("/process-video")
def process_video(req: VideoRequest):
    start = time.time()

    print("\n🚀 PIPELINE START")

    t0 = time.time()
    data = generate_transcript(req.url)
    print("⏱️ Transcript:", round(time.time() - t0, 2), "sec")

    t0 = time.time()
    sections = generate_sections(data["transcript"], data["metadata"])
    print("⏱️ Sections:", round(time.time() - t0, 2), "sec")

    t0 = time.time()
    notes = generate_notes_for_sections(sections)
    print("⏱️ Notes:", round(time.time() - t0, 2), "sec")

    t0 = time.time()
    revision = generate_revision_from_notes(notes)
    print("⏱️ Revision:", round(time.time() - t0, 2), "sec")

    print("✅ TOTAL TIME:", round(time.time() - start, 2), "sec")

    return {
        "metadata": data["metadata"],
        "sections": sections,
        "notes": notes,
        "revision": revision
    }

