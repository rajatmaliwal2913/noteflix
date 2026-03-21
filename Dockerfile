# Use a slim image for reduced size
FROM python:3.11-slim

# Install system dependencies
# ffmpeg: required for video processing
# libsm6, libxext6: required for OpenCV (though headless might not need them, good for safety)
# git: required for some pip installs
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    libgl1 \
    libglib2.0-0 \
    git \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the monorepo structure
# .dockerignore will handle excluding node_modules, venvs, etc.
COPY ai_pipeline /app/ai_pipeline
COPY backend /app/backend

# Optimization strategy:
# 1. Install CPU-only torch (saves ~5-7GB)
# 2. Replace opencv-python with headless version (saves ~100MB)
# 3. Remove local/git dependencies from requirements to avoid conflicts
# 4. Install remaining requirements with no-cache-dir
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install -e /app/ai_pipeline && \
    sed -i '/-e git+/d' /app/backend/requirements.txt && \
    sed -i '/torch/d' /app/backend/requirements.txt && \
    sed -i 's/opencv-python==/opencv-python-headless==/' /app/backend/requirements.txt && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

WORKDIR /app/backend

# Set dynamic port for Railway
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
