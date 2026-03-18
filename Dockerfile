# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build the React frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /build/frontend

# Disable npm fund/audit warnings and set higher memory
ENV NODE_OPTIONS="--max-old-space-size=4096" \
    npm_config_fund=false \
    npm_config_audit=false

# Install dependencies – try npm ci first, fallback to npm install
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit || npm install --no-audit

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Runtime – single uvicorn process serves API + static frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/app/ ./app/

# Copy built frontend into the location FastAPI StaticFiles expects
COPY --from=frontend-builder /build/frontend/dist ./static/

# Runtime directories
RUN mkdir -p uploads runs templates

# Copy seed templates
COPY templates/ ./templates/

EXPOSE 3000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3000"]
