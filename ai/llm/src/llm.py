
import json
import os
import requests
 
OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'qwen2.5:3b')
 
 
def execute_llm(prompt: str, text: str) -> dict:

    full_prompt = (
        f"{prompt}\n\n"
        "Answer ONLY with a valid JSON object, with no extra text "
        "and no markdown.\n\n"
        f"Text:\n\"\"\"{text}\"\"\""
    )
 
    response = requests.post(
        f"{OLLAMA_HOST}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": full_prompt,
            "format": "json",   # forces Ollama to produce syntactically valid JSON
            "stream": False,
        },
        timeout=60,
    )
    response.raise_for_status()
 
    raw_output = response.json()['response']
    return json.loads(raw_output)
