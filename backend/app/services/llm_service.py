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
