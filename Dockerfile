FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for FAISS
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything
COPY . .

# Set Python path to find backend modules
ENV PYTHONPATH=/app/backend

EXPOSE 8000

# Start from the root context
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
