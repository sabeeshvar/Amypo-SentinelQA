# ==============================================================================
# VeriQuery / Amypo-SentinelQA - Dockerfile (100% Offline Self-Hosted Pipeline)
# HackWithAMYPO 2026: Merged Problem Statements PS7 & PS2
# ==============================================================================
FROM python:3.11-slim

# Prevent interactive prompts & buffer output
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    RAM_LIMIT_GB=8.0 \
    OLLAMA_BASE_URL=http://ollama:11434

WORKDIR /app

# Install system dependencies (compiler for onnxruntime/chromadb & curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend source code and config
COPY backend /app/backend
COPY conftest.py /app/conftest.py
COPY start.py /app/start.py

# Copy built frontend distribution for static serving
COPY frontend/dist /app/frontend/dist

# Expose FastAPI application port
EXPOSE 8000

# Health check against /api/v1/health
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Start the offline application
CMD ["python", "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]
