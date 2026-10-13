# LLM

Turns the extracted text into a transaction (type, amount, category and description) by asking an LLM served by [Ollama](https://ollama.com) to answer in JSON.

Consumes the queue `llm.processing`; publishes `llm.processed` (or `llm.failed`) on the `pipeline` exchange.

## Requirements

- Python 3.12
- RabbitMQ and Ollama with the model pulled. From the repository root: `docker compose up -d rabbitmq ollama-pull`

## Configuration

| Variable | Default | Description |
|---|---|---|
| `RABBITMQ_URL` | | RabbitMQ connection string |
| `OLLAMA_HOST` | `http://localhost:11434` | URL of the Ollama server |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Model used by Ollama |

Variables can also be set in a `.env` file in this folder.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export RABBITMQ_URL=amqp://admin:admin@localhost:5672/
python main.py
```

## Run with Docker

From the repository root (it also starts RabbitMQ and Ollama):

```bash
docker compose up --build llm
```
