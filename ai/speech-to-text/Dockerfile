# syntax=docker/dockerfile:1

FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# ---- Python dependencies, including the CUDA userspace libraries (cuBLAS/cuDNN) ----
COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

# ctranslate2 loads cuBLAS and cuDNN at runtime: without this it can't find them
ENV LD_LIBRARY_PATH=/usr/local/lib/python3.12/site-packages/nvidia/cublas/lib:/usr/local/lib/python3.12/site-packages/nvidia/cudnn/lib

# ---- download the model at build time (~500MB), so it doesn't happen on every startup ----
ENV HF_HOME=/opt/hf-cache
RUN python -c "from faster_whisper.utils import download_model; download_model('large-v3-turbo')"

COPY main.py ./
COPY src ./src

RUN mkdir -p /audio_files && chown 1000:1000 /audio_files

CMD ["python", "main.py"]