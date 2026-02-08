from ai_pipeline.chunking.chunker import create_sections
from app.services.llm_service import generate_section_metadata

def split_transcript_by_chapters(transcript, chapters):
    sections = []

    for chapter in chapters:
        start = chapter["start"]
        end = chapter["end"]

        text_parts = [
            seg["text"] for seg in transcript
            if seg["start"] >= start and seg["end"] <= end
        ]

        if not text_parts:
            continue

        sections.append({
            "title": chapter["title"],
            "start": start,
            "end": end,
            "text": " ".join(text_parts),
            "source": "youtube_chapters"
        })

    return sections

def generate_sections(transcript, metadata):
    # 1️⃣ YouTube chapters
    if metadata.get("chapters"):
        print("📚 Using YouTube chapters")
        base_sections = split_transcript_by_chapters(
            transcript, metadata["chapters"]
        )
    else:
        # 2️⃣ fallback chunking
        print("🧠 No chapters found → using AI chunking")
        base_sections = create_sections(transcript)

    # 3️⃣ Enrich with Gemini ⭐
    print("✨ Generating AI titles & summaries")
    return enrich_sections_with_ai(base_sections)

def enrich_sections_with_ai(sections):
    enriched = []

    for section in sections:
        print("🤖 Generating AI title:", section.get("title", "Untitled"))

        ai_meta = generate_section_metadata(section["text"])

        enriched.append({
            "title": ai_meta["title"],
            "summary": ai_meta["summary"],
            "start": section["start"],
            "end": section["end"],
            "text": section["text"],
            "source": section.get("source", "ai_generated")
        })

    return enriched
