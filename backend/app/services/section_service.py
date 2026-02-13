from ai_pipeline.chunking.chunker import create_sections
from app.services.llm_service import generate_section_metadata
import asyncio

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

async def generate_sections(transcript, metadata, selected_ranges=None):
    """
    Generate sections using YouTube chapters (no separate AI title generation).
    Uses chapter titles directly for speed.
    """
    base_sections = []

    # 1️⃣ Explicit Ranges (User Selected)
    if selected_ranges:
        print(f"✂️ Filtering for {len(selected_ranges)} selected user ranges")
        formatted_chapters = []
        for i, rng in enumerate(selected_ranges):
            formatted_chapters.append({
                "title": rng.title,
                "start": rng.start,
                "end": rng.end
            })
        base_sections = split_transcript_by_chapters(transcript, formatted_chapters)

    # 2️⃣ YouTube chapters (Default if no selection)
    elif metadata.get("chapters"):
        print("📚 Using YouTube chapters")
        base_sections = split_transcript_by_chapters(
            transcript, metadata["chapters"]
        )
    
    # 3️⃣ Fallback chunking (AI) - only if no chapters
    else:
        print("🧠 No chapters found → using AI chunking")
        base_sections = create_sections(transcript)

    # Return sections directly with YouTube chapter titles (no separate AI call)
    # Title and notes will be generated together in notes_service
    return base_sections
