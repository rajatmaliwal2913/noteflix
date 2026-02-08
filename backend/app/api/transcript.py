from fastapi import APIRouter
from pydantic import BaseModel
from app.services.transcript_service import generate_transcript

router = APIRouter()

class TranscriptRequest(BaseModel):
    url: str

@router.post("/videos/transcript")
def transcript(req: TranscriptRequest):
    return generate_transcript(req.url)
