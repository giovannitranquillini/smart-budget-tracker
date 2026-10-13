# Backend

Domain backend: REST API for transactions and categories, built with Fastify and Prisma on PostgreSQL.
It stores the uploaded audio and images, sends them to the AI pipeline through RabbitMQ, and streams the progress and the extracted draft to the UI (Server-Sent Events).

Sends to the queues `audio.processing` and `image.processing`; consumes `budget_record.processed` and the `*.processed` / `*.failed` events of the `pipeline` exchange.

## Requirements

- Node.js and pnpm
- PostgreSQL and RabbitMQ. From the repository root: `docker compose up -d postgres rabbitmq`

## Configuration

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | | PostgreSQL connection string |
| `RABBITMQ_URL` | | RabbitMQ connection string |
| `AUDIO_STORAGE_PATH` | `../audio_files` | Folder for the uploaded audio files, relative to where the service is started |
| `IMAGE_STORAGE_PATH` | `../image_files` | Folder for the uploaded images, relative to where the service is started |
| `LOG_LEVEL` | `info` | Log level |

## Run locally

```bash
pnpm install
export DATABASE_URL=postgres://admin:admin@localhost:5432/smart_budget_tracker
export RABBITMQ_URL=amqp://admin:admin@localhost:5672/
pnpm prisma:generate        # generate the Prisma client
npx prisma migrate deploy   # create the tables and the default categories
pnpm dev
```

The API is served at http://localhost:3001, its documentation at http://localhost:3001/docs.

## Run with Docker

From the repository root (it also starts PostgreSQL and RabbitMQ, and applies the migrations with the `migrate` job):

```bash
docker compose up --build backend
```
