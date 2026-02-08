import os
import json
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

model = genai.GenerativeModel("gemini-1.5-flash")


def generate_section_metadata(section_text: str):
    """
    Generate title + summary for a lecture section
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

    response = model.generate_content(prompt)
    text = response.text.strip()

    # Gemini sometimes wraps JSON in ```json ```
    text = text.replace("```json", "").replace("```", "")

    return json.loads(text)
