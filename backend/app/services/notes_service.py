from app.services.llm_service import generate_section_notes
import time


def generate_notes_for_sections(sections):
    """
    Generate AI notes for each lecture section.
    """

    notes = []

    for section in sections:
        print("📝 Generating notes for:", section["title"])

        ai_notes = generate_section_notes(section["text"])
        time.sleep(3)
        notes.append({
            "title": section["title"],
            "summary": section["summary"],
            "start": section["start"],
            "end": section["end"],
            "notes": ai_notes
        })

    return notes
