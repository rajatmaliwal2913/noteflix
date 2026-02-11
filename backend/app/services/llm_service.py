import os
import json
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq
import time
import re
from groq import RateLimitError
# Load .env from backend root
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path)

client = Groq(
    api_key=os.getenv("GROQ_API_KEY"),
    timeout=30,
)



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

    response = groq_with_retry(
        client.chat.completions.create,
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )

    text = response.choices[0].message.content.strip()

    # Remove ```json if model wraps output
    text = text.replace("```json", "").replace("```", "")

    return safe_json_loads(text)


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

    response = groq_with_retry(
        client.chat.completions.create,
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    text = response.choices[0].message.content.strip()
    text = text.replace("```json", "").replace("```", "")

    return safe_json_loads(text)



def generate_tldr(notes_text: str):
    prompt = f"""
Create a concise TLDR summary (5-7 bullet points)
from these lecture notes.

Return JSON:
{{ "tldr": ["", "", ""] }}

Notes:
{notes_text[:4000]}
"""
    response = groq_with_retry(
        client.chat.completions.create,
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return safe_json_loads(response.choices[0].message.content)

def generate_flashcards(notes_text: str):
    prompt = f"""
Create 5 study flashcards from these notes.

Return JSON:
{{ "flashcards":[{{"question":"","answer":""}}] }}

Notes:
{notes_text[:4000]}
"""
    response = groq_with_retry(
        client.chat.completions.create,
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return safe_json_loads(response.choices[0].message.content)

def generate_quiz(notes_text: str):
    prompt = f"""
Create 3 MCQ quiz questions.

Return JSON:
{{ "quiz":[{{"question":"","options":["A","B","C","D"],"answer":"A"}}] }}

Notes:
{notes_text[:4000]}
"""
    response = groq_with_retry(
        client.chat.completions.create,
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return safe_json_loads(response.choices[0].message.content)

def generate_interview_questions(notes_text: str):
    prompt = f"""
Create 5 interview questions from these notes.

Return JSON:
{{ "questions":["","",""] }}

Notes:
{notes_text[:4000]}
"""
    response = groq_with_retry(
        client.chat.completions.create,
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return safe_json_loads(response.choices[0].message.content)



def chat_with_context(question: str, context_docs: list[str]):
    """
    Answer user question using retrieved lecture context.
    """

    context = "\n\n".join(context_docs)

    prompt = f"""
You are a helpful study assistant.

Use the lecture context below to answer the question.
If answer is not in context, say you don't know.

Lecture Context:
{context[:8000]}

Question:
{question}
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return response.choices[0].message.content
def groq_with_retry(func, *args, **kwargs):
    """
    Retry Groq calls when rate limited.
    """
    for attempt in range(3):
        try:
            return func(*args, **kwargs)
        except RateLimitError as e:
            wait_time = 8 + attempt * 4
            print(f"⏳ Rate limited. Waiting {wait_time}s...")
            time.sleep(wait_time)

    raise Exception("Groq failed after retries")

def safe_json_loads(text: str):
    """
    Extract JSON from messy LLM output safely.
    """

    if not text:
        raise Exception("Empty LLM response")

    # remove markdown code fences
    text = text.replace("```json", "").replace("```", "")

    # find first JSON object in text
    match = re.search(r"\{.*\}", text, re.DOTALL)

    if not match:
        raise Exception("No JSON found in LLM response")

    json_text = match.group(0)

    return json.loads(json_text)
