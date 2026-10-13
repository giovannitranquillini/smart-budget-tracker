# OCR

Reads the text of receipt photos with [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR), configured for Italian and running on the CPU through ONNX Runtime.

Consumes the queue `ocr.processing`; publishes `ocr.processed` (or `ocr.failed`) on the `pipeline` exchange.

## Requirements

- Python 3.12
- RabbitMQ. From the repository root: `docker compose up -d rabbitmq`
- Access to the images saved by the [backend](../../backend): the message only contains their path

## Configuration

| Variable | Default | Description |
|---|---|---|
| `RABBITMQ_URL` | | RabbitMQ connection string |

Variables can also be set in a `.env` file in this folder.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export RABBITMQ_URL=amqp://admin:admin@localhost:5672/
python main.py
```

The first time, the PaddleOCR models are downloaded.
To run on an NVIDIA GPU, replace `onnxruntime` with `onnxruntime-gpu` in `requirements.txt`.

## Run with Docker

From the repository root:

```bash
docker compose up --build ocr
```

The models are downloaded during the build, so the image is ready to use.
