from app.services.embedding_service import search_sections
from app.services.llm_service import chat_with_context


async def ask_lecture_question(question: str, transcript=None):
    """
    RAG pipeline:
    - If transcript provided, use it directly (faster)
    - Otherwise, use embedding search
    """
    if transcript and len(transcript) > 0:
        # Use raw transcript for context (faster, no embedding lookup needed)
        context_texts = [seg.get("text", "") for seg in transcript if seg.get("text")]
        answer = await chat_with_context(question, context_texts)
        return {
            "answer": answer,
            "sources": []
        }
    else:
        # Fallback to embedding search
        relevant_sections = search_sections(question)
        answer = await chat_with_context(question, relevant_sections)
        return {
            "answer": answer,
            "sources": relevant_sections
        }
