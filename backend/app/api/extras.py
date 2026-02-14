from fastapi import APIRouter, HTTPException
from app.schemas.video import ExtrasRequest
from app.services.llm_service import (
    generate_tldr,
    generate_flashcards,
    generate_quiz,
    generate_interview_questions
)

router = APIRouter()

@router.post("/generate-tldr")
async def api_generate_tldr(req: ExtrasRequest):
    try:
        data = await generate_tldr(req.notes_text, req.language)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-flashcards")
async def api_generate_flashcards(req: ExtrasRequest):
    try:
        data = await generate_flashcards(req.notes_text, req.language)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-quiz")
async def api_generate_quiz(req: ExtrasRequest):
    try:
        data = await generate_quiz(req.notes_text, req.language)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-interview")
async def api_generate_interview(req: ExtrasRequest):
    try:
        # Note: The frontend calls it /generate-interview but the service function is generate_interview_questions
        # The service returns {"questions": [...]}, frontend expects that.
        data = await generate_interview_questions(req.notes_text, req.language)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
