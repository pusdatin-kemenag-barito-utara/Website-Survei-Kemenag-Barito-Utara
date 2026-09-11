# ==============================================================================
# Multi-Stage Dockerfile for SI-ARUS Kemenag Barito Utara (Coolify + Infisical)
# Astro 7 SSR Node.js Frontend + Golang Fiber Backend
# ==============================================================================

# STAGE 1: Build Backend Golang Binary
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app/backend
ENV GOTOOLCHAIN=auto

RUN apk add --no-cache git gcc musl-dev

COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o api-sikap main.go

# ------------------------------------------------------------------------------

# STAGE 2: Build Frontend Astro Static/SSR Bundle
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --include=dev
COPY frontend/ ./
ENV ASTRO_TELEMETRY_DISABLED=1

RUN npm run build
RUN npm prune --production

# ------------------------------------------------------------------------------

# STAGE 3: Production Runner Container with Infisical Secret Injection
FROM node:22-alpine AS runner
WORKDIR /app

# Install runtime utilities and Infisical CLI
RUN apk add --no-cache ca-certificates tzdata curl wget bash dos2unix \
  && curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash \
  && apk add --no-cache infisical

# Install concurrently globally for simultaneous backend and frontend execution
RUN npm install -g concurrently

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV GO_PORT=8080
ENV BACKEND_PORT=8080

# Copy Go backend binary
COPY --from=backend-builder /app/backend/api-sikap /app/api-sikap
RUN chmod +x /app/api-sikap

# Copy Astro frontend build & dependencies
COPY --from=frontend-builder /app/frontend/package.json /app/package.json
COPY --from=frontend-builder /app/frontend/node_modules /app/node_modules
COPY --from=frontend-builder /app/frontend/dist /app/dist

# Copy entrypoint script and ensure executable with unix line endings
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN dos2unix /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000 8080

# Explicit Docker Healthcheck for Coolify / Docker Engine
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -f http://127.0.0.1:3000/api/health || curl -f http://127.0.0.1:8080/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]

# Run Astro Frontend on PORT 3000 and Golang Backend on PORT 8080 concurrently
CMD ["concurrently", "-k", "-n", "WEB,API", "-c", "cyan,green", "node /app/dist/server/entry.mjs", "/app/api-sikap"]