from app.services.llm_service import generate_revision_material


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
    """
    Generate TLDR, flashcards, quiz from notes.
    """

    full_text = combine_notes_text(notes)
    return generate_revision_material(full_text)
