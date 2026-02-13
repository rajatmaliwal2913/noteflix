from app.services.llm_service import (
    generate_tldr,
    generate_flashcards,
    generate_quiz,
    generate_interview_questions,
)
import asyncio

def combine_notes_text(notes):
    """
    Convert notes JSON → text for LLM.
    """

    parts = []

    for section in notes:
        parts.append(f"Section: {section['title']}")
        parts.append(section["summary"])

        content = section["notes"]

        parts.append("Bullet Notes:")
        parts.extend(content["bullet_notes"])

        parts.append("Explanation:")
        parts.append(content["explanation"])

        parts.append("Key Concepts:")
        parts.extend(content["key_concepts"])

        parts.append("\n")

    return "\n".join(parts)


async def generate_revision_from_notes(notes):
    text = combine_notes_text(notes)

    print("📚 Generating TLDR (Async)...")
    # Run independent tasks in parallel
    tldr_task = generate_tldr(text)
    flashcards_task = generate_flashcards(text)
    quiz_task = generate_quiz(text)
    interview_task = generate_interview_questions(text)

    # Wait for all
    tldr, flashcards, quiz, interview = await asyncio.gather(
        tldr_task, flashcards_task, quiz_task, interview_task
    )

    return {
        "tldr": tldr["tldr"],
        "flashcards": flashcards["flashcards"],
        "quiz": quiz["quiz"],
        "interview_questions": interview["questions"],
    }