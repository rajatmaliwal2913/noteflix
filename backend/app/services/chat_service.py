from app.services.embedding_service import search_sections
from app.services.llm_service import chat_with_context


def ask_lecture_question(question: str):
    """
    RAG pipeline:
    search → LLM answer
    """

    relevant_sections = search_sections(question)
    answer = chat_with_context(question, relevant_sections)

    return {
        "answer": answer,
        "sources": relevant_sections
    }
