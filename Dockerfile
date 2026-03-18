# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build the React frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-slim AS frontend-builder

WORKDIR /build/frontend

# Install dependencies first (layer cache)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Runtime – Python backend + Nginx to serve frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Install nginx and supervisor (to run nginx + uvicorn together)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# ── Backend ──────────────────────────────────────────────────────────────────
WORKDIR /app/backend

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app/ ./app/

# Runtime directories
RUN mkdir -p uploads runs templates

# ── Frontend static files ─────────────────────────────────────────────────────
COPY --from=frontend-builder /build/frontend/dist /usr/share/nginx/html

# ── Config files ──────────────────────────────────────────────────────────────
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Remove the default nginx site config that conflicts
RUN rm -f /etc/nginx/sites-enabled/default

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# ── Templates (optional seed data) ───────────────────────────────────────────
COPY templates/ /app/backend/templates/

EXPOSE 80

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
