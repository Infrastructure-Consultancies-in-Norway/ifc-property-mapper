FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/app/ ./app/

# Copy pre-built frontend (committed to repo, no Node needed at build time)
COPY frontend/dist/ ./static/

# Runtime directories
RUN mkdir -p uploads runs templates

# Copy seed templates
COPY templates/ ./templates/

EXPOSE 3000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3000"]
