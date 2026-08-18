# Stage 1: Build Golang Backend
FROM golang:1.26-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o api-sikap main.go

# Stage 2: Minimalist Production Runner
FROM alpine:3.20 AS runner
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata curl

COPY --from=builder /app/api-sikap /app/api-sikap

EXPOSE 8080

CMD ["/app/api-sikap"]
