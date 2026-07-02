import os
import json
from groq import Groq


def normalize_and_describe(raw_name: str, brand: str) -> dict:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {
            "title": raw_name,
            "description": "",
            "slug": raw_name.lower().replace(" ", "-"),
        }

    client = Groq(api_key=api_key)

    prompt = f"""
You are an AI assistant for a mobile phone catalog website.
Analyze the following raw product name: '{raw_name}' (Brand: {brand}).

Provide a JSON response with the following keys:
1. "title": The official, clean smartphone name (remove colors, storage, RAM).
2. "slug": A URL-friendly slug (lowercase, hyphens).
3. "description": A 50-word SEO-friendly buying recommendation.

Return ONLY valid JSON. No markdown formatting.
"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You output strictly valid JSON without markdown code blocks.",
                },
                {"role": "user", "content": prompt},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        content = chat_completion.choices[0].message.content
        data = json.loads(content)
        return data

    except Exception as e:
        print(f"Groq API Error: {e}")
        return {
            "title": raw_name,
            "slug": raw_name.lower().replace(" ", "-"),
            "description": "",
        }
