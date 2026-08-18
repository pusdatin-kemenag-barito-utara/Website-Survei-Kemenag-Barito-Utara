# Stage 1: Build Astro Frontend
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --include=dev

COPY . ./
ENV ASTRO_TELEMETRY_DISABLED=1

RUN npm run build
RUN npm prune --production

# Stage 2: Production Runner
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata curl

COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/dist /app/dist

ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", "/app/dist/server/entry.mjs"]
