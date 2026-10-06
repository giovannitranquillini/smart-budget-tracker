# syntax=docker/dockerfile:1

FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# ---- dipendenze Python, incluse le librerie CUDA userspace (cuBLAS/cuDNN) ----
COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

# ctranslate2 carica cuBLAS e cuDNN a runtime: senza questo non le trova
ENV LD_LIBRARY_PATH=/usr/local/lib/python3.12/site-packages/nvidia/cublas/lib:/usr/local/lib/python3.12/site-packages/nvidia/cudnn/lib

# ---- scarica il modello in fase di build (~500MB), così non lo fa a ogni avvio ----
ENV HF_HOME=/opt/hf-cache
RUN python -c "from faster_whisper.utils import download_model; download_model('large-v3-turbo')"

COPY main.py ./
COPY src ./src

RUN mkdir -p /audio_files && chown 1000:1000 /audio_files

CMD ["python", "main.py"]