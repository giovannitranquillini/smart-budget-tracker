# AI Backend

Orchestrator of the AI pipeline. It forwards audio and images to [speech-to-text](../speech-to-text) and [OCR](../ocr), builds the LLM prompt from the extracted text and the current categories (fetched from the [backend](../../backend)), and hands the [LLM](../llm) result back to the backend.

Consumes the queues `audio.processing`, `image.processing` and the events `audio.processed`, `ocr.processed`, `llm.processed`; sends to `speech_to_text.processing`, `ocr.processing`, `llm.processing` and `budget_record.processed`.

- `api/`: the service (TypeScript)
- `messaging/`: a small RabbitMQ helper (amqplib) used by the service

## Requirements

- Node.js and pnpm
- RabbitMQ. From the repository root: `docker compose up -d rabbitmq`
- The [backend](../../backend) running, to fetch the categories

## Configuration

| Variable | Default | Description |
|---|---|---|
| `RABBITMQ_URL` | | RabbitMQ connection string |
| `BACKEND_URL` | `http://localhost:3001` | URL of the backend, used to fetch the categories |

## Run locally

```bash
(cd messaging && pnpm install)
pnpm install
cp .env.template .env   # then set your RabbitMQ credentials
pnpm dev
```

## Run with Docker

From the repository root:

```bash
docker compose up --build ai-backend
```
