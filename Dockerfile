# Multi-stage Dockerfile for SIKAP Kemenag (Golang Fiber Backend + Next.js Frontend)

# Stage 1: Build Golang Backend
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o api-sikap main.go

# Stage 2: Build Next.js Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./frontend/
WORKDIR /app/frontend
RUN npm install
COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Runner Stage
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata bash curl

COPY --from=backend-builder /app/backend/api-sikap /app/api-sikap
COPY --from=frontend-builder /app/frontend/public /app/frontend/public
COPY --from=frontend-builder /app/frontend/.next/standalone /app/
COPY --from=frontend-builder /app/frontend/.next/static /app/frontend/.next/static

EXPOSE 3000 8080

CMD ["sh", "-c", "/app/api-sikap & HOSTNAME=0.0.0.0 PORT=3000 node frontend/server.js"]
