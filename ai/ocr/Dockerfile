# syntax=docker/dockerfile:1

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PADDLE_PDX_CACHE_HOME=/opt/paddlex \
    PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True

# opencv (installato da paddleocr) ha bisogno di libGL/glib, onnxruntime di libgomp
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# ---- scarica i modelli in fase di build, così non lo fa a ogni avvio ----
# stessi parametri di src/ocr.py: se li cambi lì, cambiali anche qui
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(lang='it', engine='onnxruntime', use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False)"

COPY main.py ./
COPY src ./src

# il volume image_files prende owner/permessi da qui: il backend scrive come uid 1000 (node)
RUN mkdir -p /image_files && chown 1000:1000 /image_files

CMD ["python", "main.py"]
