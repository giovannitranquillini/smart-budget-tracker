
# syntax=docker/dockerfile:1
FROM python:3.12-slim
 
WORKDIR /app
 
COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt
 
COPY main.py ./
COPY src/ ./src/
 
CMD ["python", "main.py"]
