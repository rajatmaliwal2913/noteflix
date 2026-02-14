import os
import json
import time
import re
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from groq import AsyncGroq, RateLimitError

# ---------------------------------------------------
# ENV + CLIENT
# ---------------------------------------------------

# Load .env from backend root
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path)

client = AsyncGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    timeout=15,  # Reduced timeout for faster failures
)

MODEL = "llama-3.1-8b-instant"

# ---------------------------------------------------
# RETRY + SAFE JSON HELPERS
# ---------------------------------------------------

# Global Semaphore to limit concurrent Groq calls
# Increased for faster parallel processing
GROQ_SEMAPHORE = asyncio.Semaphore(10)

async def groq_with_retry(func, *args, **kwargs):
    """
    Retry Groq calls when rate limited.
    Wrapped in a semaphore to prevent flooding.
    Optimized for speed - fewer retries, shorter waits.
    """
    async with GROQ_SEMAPHORE:
        for attempt in range(2):  # Reduced retries for speed
            try:
                return await func(*args, **kwargs)
            except RateLimitError:
                wait_time = 3 + attempt * 2  # Shorter waits
                print(f"⏳ Groq rate limited. Waiting {wait_time}s...")
                await asyncio.sleep(wait_time)
            except Exception as e:
                if attempt == 1: raise e
                print(f"⚠️ Groq error: {e}. Retrying...")
                await asyncio.sleep(1)  # Shorter wait

    raise Exception("Groq failed after retries")


def safe_json_loads(text: str):
    """
    Extract JSON from messy LLM output safely.
    """
    if not text:
        raise Exception("Empty LLM response")

    # Remove markdown code fences
    text = text.replace("```json", "").replace("```", "").strip()

    # Try to parse directly first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Find first JSON object in text (more robust pattern)
    # Look for { ... } with balanced braces
    brace_count = 0
    start_idx = -1
    for i, char in enumerate(text):
        if char == '{':
            if start_idx == -1:
                start_idx = i
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0 and start_idx != -1:
                try:
                    json_str = text[start_idx:i+1]
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    # Try again with next occurrence
                    start_idx = -1
                    brace_count = 0
                    continue

    # Fallback: try regex match
    match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    # Last resort: print the response for debugging
    print(f"⚠️ Failed to parse JSON. Response preview: {text[:500]}")
    raise Exception(f"No valid JSON found in LLM response. Response: {text[:200]}...")


async def call_llm(prompt: str, temperature: float = 0.2):
    response = await groq_with_retry(
        client.chat.completions.create,
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
    )

    text = response.choices[0].message.content.strip()
    # Remove ```json if model wraps output
    return text.replace("```json", "").replace("```", "")


async def generate_section_metadata(section_text: str):
    """
    Generate short title and summary for a section.
    """
    prompt = f"""
    Analyze this lecture section.
    Return JSON:
    {{
        "title": "Short descriptive title (No 'Section 1' etc)",
        "summary": "1-sentence summary (Direct, no 'The speaker...')"
    }}

    Text:
    {section_text[:3000]}
    """
    response = await groq_with_retry(
        client.chat.completions.create,
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )
    return safe_json_loads(response.choices[0].message.content)


async def generate_section_notes_with_title(
    section_text: str,
    chapter_title: str,
    depth: str,
    format_type: str,
    tone: str,
    language: str,
    include_visuals: bool,
    include_code: bool
):
    """
    Generate title, summary, and notes in ONE call for speed.
    Uses chapter title as hint but can improve it.
    """
    
    # Map format to instruction
    format_rules = ""
    if "Bullet" in format_type or "bullet" in format_type.lower():
        format_instruction = "Bullet Points"
        format_rules = (
            '- STRICTLY set "explanation" to "" (empty string).\n'
            '- Provide ALL content in "bullet_notes" as a list of strings.\n'
            '- DO NOT write any paragraphs.'
        )
    elif "Paragraph" in format_type or "paragraph" in format_type.lower():
        format_instruction = "Paragraphs"
        format_rules = (
            '- STRICTLY set "bullet_notes" to [] (empty list).\n'
            '- Provide ALL content in "explanation" as coherent paragraphs.\n'
            '- DO NOT use bullet points.'
        )
    else:
        format_instruction = "Mixed"
        format_rules = '- Use both "explanation" and "bullet_notes" for a comprehensive overview.'
    
    # Map depth to instruction and length constraints
    depth_instruction = ""
    length_constraint = ""
    if "Concise" in depth or "concise" in depth.lower():
        depth_instruction = "Concise"
        length_constraint = "Keep the content brief and to the point (under 150 words)."
    elif "Detailed" in depth or "detailed" in depth.lower():
        depth_instruction = "Detailed"
        length_constraint = "Provide a comprehensive, in-depth explanation covering all nuances (min 400 words)."
    else:
        depth_instruction = "Standard"
        length_constraint = "Aim for a balanced explanation with key details (approx 200-250 words)."
    
    # Build context instructions based on user preferences
    context_instructions = []
    if include_visuals:
        context_instructions.append("Include descriptions of visual elements, diagrams, or UI components when mentioned")
    if include_code:
        context_instructions.append("Include code snippets, commands, or technical implementation details when present")
    
    context_note = "\n".join(context_instructions) if context_instructions else "Focus on conceptual content"
    
    prompt = f"""Create notes from lecture section. Return ONLY valid JSON, no other text.

Chapter: {chapter_title}
Format: {format_instruction} | Depth: {depth_instruction} | Tone: {tone} | Language: {language}

Rules:
- Write ALL content strictly in {language}.
- CRITICAL: If language is Hindi, use Devanagari script (e.g., "नमस्ते"). DO NOT use Hinglish.
- CRITICAL: If language is Chinese, use Hanzi (Simplified).
- CRITICAL: If language is Japanese, use Kanji/Kana.
- Follow the {format_instruction} format strictly.
{format_rules}
- Adopt a {tone} tone.
- {depth_instruction} content depth.
- {length_constraint}
- Write facts directly, no "speaker says" phrases
- CORRECT spelling errors automatically
- Use proper brand names and capitalization
- Title should be concise and descriptive
- Return ONLY the JSON object, no explanations or markdown
- {context_note}

Required JSON format (return exactly this structure):
{{
  "title": "improved title (use chapter as hint)",
  "summary": "1-sentence summary",
  "explanation": "main explanation",
  "bullet_notes": ["point 1", "point 2"],
  "examples": ["example"],
  "key_concepts": ["concept"],
  "difficulty": "Beginner|Intermediate|Advanced"
}}

Text:
{section_text[:2500]}
"""
    
    response = await groq_with_retry(
        client.chat.completions.create,
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=4000,
    )

    text = response.choices[0].message.content.strip()
    return safe_json_loads(text)

# Keep old function for backwards compatibility if needed
async def generate_section_notes(
    section_text: str,
    depth: str,
    format_type: str,
    tone: str,
    language: str,
    include_visuals: bool,
    include_code: bool
):
    """Legacy function - calls generate_section_notes_with_title"""
    result = await generate_section_notes_with_title(
        section_text, "", depth, format_type, tone, language, include_visuals, include_code
    )
    return {
        "explanation": result.get("explanation", ""),
        "bullet_notes": result.get("bullet_notes", []),
        "examples": result.get("examples", []),
        "key_concepts": result.get("key_concepts", []),
        "difficulty": result.get("difficulty", "Intermediate")
    }




async def generate_tldr(notes_text: str, language: str = "English"):
    prompt = f"""
    Create a concise TLDR summary (5-7 bullet points) from these lecture notes.
    
    CRITICAL: Write ALL content strictly in {language}.
    
    Return JSON:
    {{ "tldr": ["", "", ""] }}
    
    Notes:
    {notes_text[:4000]}
    """
    response = await groq_with_retry(
        client.chat.completions.create,
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return safe_json_loads(response.choices[0].message.content)

async def generate_flashcards(notes_text: str, language: str = "English", count: int = 5, seed: int = 0):
    variation_prompt = ""
    if seed > 0:
        variation_prompt = f"Variation Seed: {seed}. Ensure content differs from previous generations."

    prompt = f"""
    Create exactly {count} study flashcards from these notes.
    {variation_prompt}
    
    CRITICAL: Write ALL content strictly in {language}.
    
    Return JSON:
    {{ "flashcards":[{{"question":"Term or Concept","answer":"Definition or Explanation"}}] }}
    
    Notes:
    {notes_text[:6000]}
    """
    response = await groq_with_retry(
        client.chat.completions.create,
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return safe_json_loads(response.choices[0].message.content)

async def generate_quiz(notes_text: str, language: str = "English", seed: int = 0):
    variation_prompt = ""
    if seed > 0:
        variation_prompt = f"Variation Seed: {seed}. Ensure these questions are DIFFERENT from previous sets."

    prompt = f"""
    Create 5 MCQ quiz questions.
    {variation_prompt}
    
    CRITICAL: Write ALL content strictly in {language}.
    
    Return JSON:
    {{ "quiz":[{{"question":"","options":["A","B","C","D"],"answer":"A"}}] }}
    
    Notes:
    {notes_text[:4000]}
    """
    response = await groq_with_retry(
        client.chat.completions.create,
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return safe_json_loads(response.choices[0].message.content)

async def generate_interview_questions(notes_text: str, language: str = "English"):
    prompt = f"""
    Create 5 interview questions from these notes.
    
    CRITICAL: Write ALL content strictly in {language}.
    
    Return JSON:
    {{ "questions":["","",""] }}
    
    Notes:
    {notes_text[:4000]}
    """
    response = await groq_with_retry(
        client.chat.completions.create,
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return safe_json_loads(response.choices[0].message.content)



async def generate_tldr(notes_text: str, language: str = "English"):
    prompt = f"""
    Create a "Too Long; Didn't Read" (TLDR) summary of these notes.
    
    Structure:
    1. A concise summary paragraph (2-3 sentences).
    2. 3-5 key takeaways (bullet points).
    
    CRITICAL: Write ALL content strictly in {language}.
    
    Return JSON:
    {{ "tldr": ["Summary paragraph...", "Key takeaway 1", "Key takeaway 2", "Key takeaway 3"] }}
    
    Notes:
    {notes_text[:6000]}
    """
    response = await groq_with_retry(
        client.chat.completions.create,
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return safe_json_loads(response.choices[0].message.content)


async def chat_with_context(question: str, context_docs: list[str]):
    """
    Answer user question using retrieved lecture context.
    """

    context = "\n\n".join(context_docs)

    prompt = f"""
You are a helpful AI study assistant. 
You are NOT the speaker or the instructor. You are an AI helping the student understand the content.

Instructions:
1. Answer the user's question clearly and concisely.
2. Use the "Lecture Context" below as your primary source of information.
3. If the answer is found in the context, explain it well.
4. CRITICAL: If the answer is NOT in the context but is a general knowledge question (e.g., "Who invented X?", "What is Y?", "Who are you?"), answer it using your general knowledge.
   - DO NOT say "The lecture doesn't mention..." or "Based on my general knowledge...". Just give the answer directly.
   - Example: User: "Who invented Python?" -> You: "Python was created by Guido van Rossum." (NOT "The lecture doesn't say, but...")
5. If the question conflicts with the lecture, stick to the lecture facts for context-specific queries.
6. NEVER roleplay as the teacher/speaker.

Lecture Context:
{context[:8000]}

Question:
{question}
"""

    response = await groq_with_retry(
        client.chat.completions.create,
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return response.choices[0].message.content

