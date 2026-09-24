
import json
import os
import requests
 
OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.2')
 
 
def execute_llm(prompt: str, text: str) -> dict:
    """
    Chiama il modello Ollama locale chiedendo di applicare `prompt` su `text`
    e di rispondere solo con un oggetto JSON. Ritorna il JSON già parsato
    come dict (pronto per essere usato come record).
    """
    full_prompt = (
        f"{prompt}\n\n"
        "Rispondi SOLO con un oggetto JSON valido, senza testo aggiuntivo "
        "e senza markdown.\n\n"
        f"Testo:\n\"\"\"{text}\"\"\""
    )
 
    response = requests.post(
        f"{OLLAMA_HOST}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": full_prompt,
            "format": "json",   # forza Ollama a produrre JSON sintatticamente valido
            "stream": False,
        },
        timeout=60,
    )
    response.raise_for_status()
 
    raw_output = response.json()['response']
    return json.loads(raw_output)
