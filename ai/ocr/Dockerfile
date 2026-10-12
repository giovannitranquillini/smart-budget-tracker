# syntax=docker/dockerfile:1

FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PADDLE_PDX_CACHE_HOME=/opt/paddlex \
    PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True

# opencv (installed by paddleocr) needs libGL/glib, onnxruntime needs libgomp
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# ---- download the models at build time, so it doesn't happen on every startup ----
# same parameters as src/ocr.py: if you change them there, change them here too
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(lang='it', engine='onnxruntime', use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=False)"

COPY main.py ./
COPY src ./src

# the image_files volume takes its owner/permissions from here: the backend writes as uid 1000 (node)
RUN mkdir -p /image_files && chown 1000:1000 /image_files

CMD ["python", "main.py"]
