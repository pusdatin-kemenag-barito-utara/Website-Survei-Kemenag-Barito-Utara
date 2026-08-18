# Multi-stage Dockerfile for SIKAP Kemenag (Golang Fiber Backend + Astro 7 Frontend)

# Stage 1: Build Golang Backend
FROM golang:1.26-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o api-sikap main.go

# Stage 2: Build Astro Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
ENV ASTRO_TELEMETRY_DISABLED=1
ENV PUBLIC_API_URL=http://127.0.0.1:8080/api/v1
ENV PUBLIC_APP_URL=http://localhost:3000

RUN npm run build

# Stage 3: Runner Stage
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata bash curl

COPY --from=backend-builder /app/backend/api-sikap /app/api-sikap
COPY --from=frontend-builder /app/frontend/dist /app/dist

EXPOSE 3000 8080

CMD ["sh", "-c", "PORT=8080 /app/api-sikap & HOSTNAME=0.0.0.0 PORT=3000 node /app/dist/server/entry.mjs"]