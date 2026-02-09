from app.services.llm_service import (
    generate_tldr,
    generate_flashcards,
    generate_quiz,
    generate_interview_questions,
)
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


def generate_revision_from_notes(notes):
    text = combine_notes_text(notes)

    print("📚 Generating TLDR...")
    tldr = generate_tldr(text)

    print("🧠 Generating flashcards...")
    flashcards = generate_flashcards(text)

    print("❓ Generating quiz...")
    quiz = generate_quiz(text)

    print("💼 Generating interview questions...")
    interview = generate_interview_questions(text)

    return {
        "tldr": tldr["tldr"],
        "flashcards": flashcards["flashcards"],
        "quiz": quiz["quiz"],
        "interview_questions": interview["questions"],
    }