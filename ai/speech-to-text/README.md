# Speech-to-text

Transcribes the recorded audio with Whisper `large-v3-turbo` ([faster-whisper](https://github.com/SYSTRAN/faster-whisper)) on an NVIDIA GPU.

Consumes the queue `speech_to_text.processing`; publishes `audio.processed` (or `speech_to_text.failed`) on the `pipeline` exchange.

## Requirements

- Python 3.12
- An NVIDIA GPU with a CUDA 12 driver
- RabbitMQ. From the repository root: `docker compose up -d rabbitmq`
- Access to the audio files saved by the [backend](../../backend): the message only contains their path

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
export LD_LIBRARY_PATH=$(python -c "import nvidia.cublas.lib, nvidia.cudnn.lib; print(nvidia.cublas.lib.__path__[0] + ':' + nvidia.cudnn.lib.__path__[0])")
export RABBITMQ_URL=amqp://admin:admin@localhost:5672/
python main.py
```

The first time, the model (~1.6 GB) is downloaded from Hugging Face into `~/.cache/huggingface`.

## Run with Docker

From the repository root (it needs the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)):

```bash
docker compose up --build speech-to-text
```

The model is downloaded during the build, so the image is ready to use.
