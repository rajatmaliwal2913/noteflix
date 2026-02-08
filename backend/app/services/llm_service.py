import os
import json
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq

# Load .env from backend root
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def generate_section_metadata(section_text: str):
    """
    Generate section title + summary using Groq (Llama 3.1)
    """

    prompt = f"""
You are an expert lecture note creator.

Read this lecture transcript section and generate:

1) A short, clear section title (max 8 words)
2) A concise summary (3–4 sentences)

Return ONLY valid JSON in this format:
{{
  "title": "...",
  "summary": "..."
}}

Transcript:
{section_text[:6000]}
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )

    text = response.choices[0].message.content.strip()

    # Remove ```json if model wraps output
    text = text.replace("```json", "").replace("```", "")

    return json.loads(text)

def generate_section_notes(section_text: str):
    """
    Generate structured lecture notes for a section using Groq.
    """

    prompt = f"""
You are an expert lecture note creator.

Create structured study notes for this lecture section.

Return ONLY valid JSON in this format:
{{
  "bullet_notes": ["", "", ""],
  "explanation": "...",
  "examples": ["", ""],
  "key_concepts": ["", ""],
  "difficulty": "Beginner | Intermediate | Advanced"
}}

Lecture transcript:
{section_text[:6000]}
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    text = response.choices[0].message.content.strip()
    text = text.replace("```json", "").replace("```", "")

    return json.loads(text)


def generate_revision_material(full_notes_text: str):
    """
    Generate study revision material from full lecture notes.
    """

    prompt = f"""
You are an expert study assistant.

From the lecture notes below, generate revision material.

Return ONLY valid JSON in this format:
{{
  "tldr": "5-7 bullet summary",
  "flashcards": [
    {{"question": "...", "answer": "..."}}
  ],
  "quiz": [
    {{
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "answer": "A"
    }}
  ],
  "interview_questions": ["", "", ""]
}}

Lecture Notes:
{full_notes_text[:8000]}
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    text = response.choices[0].message.content.strip()
    text = text.replace("```json", "").replace("```", "")

    return json.loads(text)
