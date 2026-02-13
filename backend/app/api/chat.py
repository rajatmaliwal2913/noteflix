from fastapi import APIRouter
from app.schemas.video import ChatRequest
from app.services.chat_service import ask_lecture_question

router = APIRouter()


@router.post("/chat")
async def chat(req: ChatRequest):
    return await ask_lecture_question(req.question, req.transcript)
