from fastapi import APIRouter
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
    Full pipeline endpoint.
    """

    # 1️⃣ Transcript
    data = generate_transcript(req.url)

    # 2️⃣ Sections
    sections = generate_sections(data["transcript"], data["metadata"])

    # 3️⃣ Notes
    notes = generate_notes_for_sections(sections)

    # 4️⃣ Revision mode
    revision = generate_revision_from_notes(notes)

    # 5️⃣ Create embeddings for chat
    create_embeddings_for_sections(sections)

    return {
        "metadata": data["metadata"],
        "sections": sections,
        "notes": notes,
        "revision": revision
    }
