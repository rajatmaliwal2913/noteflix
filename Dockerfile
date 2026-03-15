FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ai_pipeline /app/ai_pipeline
COPY backend /app/backend

RUN pip install -e /app/ai_pipeline

RUN sed -i '/-e git+/d' /app/backend/requirements.txt && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
