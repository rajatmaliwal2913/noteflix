"""
Basic transcript chunking service.
Fallback when YouTube chapters are not available.
"""

def chunk_by_time(transcript, chunk_minutes=2):
    """
    Split transcript into ~2 minute chunks.
    """

    if not transcript:
        return []

    chunks = []
    current_chunk = []
    chunk_start = transcript[0]["start"]
    max_duration = chunk_minutes * 60

    for segment in transcript:
        if segment["end"] - chunk_start <= max_duration:
            current_chunk.append(segment)
        else:
            chunks.append(current_chunk)
            current_chunk = [segment]
            chunk_start = segment["start"]

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def merge_chunk_text(chunk):
    """
    Merge transcript segments into one section.
    """

    full_text = " ".join(seg["text"] for seg in chunk)

    return {
        "start": chunk[0]["start"],
        "end": chunk[-1]["end"],
        "text": full_text,
        "source": "ai_chunking"
    }


def create_sections(transcript):
    """
    Create fallback sections when YouTube chapters don't exist.
    """

    time_chunks = chunk_by_time(transcript)

    sections = []
    for chunk in time_chunks:
        merged = merge_chunk_text(chunk)
        sections.append(merged)

    return sections
