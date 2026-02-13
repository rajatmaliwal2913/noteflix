import asyncio
from app.services.llm_service import generate_section_notes_with_title

async def generate_notes_for_sections(
    sections, depth, format, tone, language, include_visuals, include_code
):
    """
    Generate AI notes with title in one call for each section.
    Returns notes in order as they complete.
    """
    print(f"📝 Generating notes for {len(sections)} sections...")
    print(f"   Settings: depth={depth}, format={format}, tone={tone}, language={language}")

    async def process_single_section(section, index):
        try:
            print(f"   Processing section {index + 1}/{len(sections)}: {section.get('title', 'Untitled')}")
            # Generate title and notes together in one call
            result = await generate_section_notes_with_title(
                section["text"], 
                section.get("title", ""),  # Use YouTube chapter title as hint
                depth, format, tone, language, include_visuals, include_code
            )
            
            note_item = {
                "title": result.get("title", section.get("title", "Untitled")),
                "summary": result.get("summary", ""),
                "start": section["start"],
                "end": section["end"],
                "notes": {
                    "explanation": result.get("explanation", ""),
                    "bullet_notes": result.get("bullet_notes", []),
                    "examples": result.get("examples", []),
                    "key_concepts": result.get("key_concepts", []),
                    "difficulty": result.get("difficulty", "Intermediate")
                }
            }
            
            print(f"   ✅ Generated notes for section {index + 1}")
            return (index, note_item)
        except Exception as e:
            print(f"   ❌ Error generating notes for section {index + 1}: {e}")
            note_item = {
                "title": section.get("title", "Untitled"),
                "summary": "",
                "start": section["start"],
                "end": section["end"],
                "notes": {
                    "explanation": "",
                    "bullet_notes": [],
                    "examples": [],
                    "key_concepts": [],
                    "difficulty": "Unknown"
                }
            }
            return (index, note_item)

    # Process all sections in parallel
    tasks = [process_single_section(s, i) for i, s in enumerate(sections)]
    
    # Use as_completed to get results as soon as they're ready
    results = []
    for coro in asyncio.as_completed(tasks):
        index, note_item = await coro
        results.append((index, note_item))
    
    # Sort by index to maintain order
    results.sort(key=lambda x: x[0])
    notes = [note for _, note in results]
    
    print(f"✅ Generated {len(notes)} note sections")
    return notes
