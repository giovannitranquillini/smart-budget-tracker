# Web UI

React single-page app to manage transactions and categories, record audio and upload receipts.
It talks to the [backend](../backend) through its REST API and follows the progress of the AI pipeline through Server-Sent Events.

## Requirements

- Node.js and npm
- The [backend](../backend) running

## Configuration

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3001` | URL of the backend REST API |

## Run locally

```bash
npm install
npm run dev
```

The app is served at http://localhost:5173.

## Run with Docker

From the repository root:

```bash
docker compose up --build web
```
