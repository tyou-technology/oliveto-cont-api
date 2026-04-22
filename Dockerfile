# syntax=docker/dockerfile:1.7

# ── Stage 1: deps (full) ─────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma/
RUN --mount=type=cache,id=oliveto-api-npm-full,target=/root/.npm \
    npm ci

# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npx nest build
RUN test -f dist/main.js || (echo "❌ dist/main.js not found!" && exit 1)

# ── Stage 3: production ──────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080

RUN apk add --no-cache openssl dumb-init

COPY package*.json ./
COPY prisma ./prisma/

# Cache ID diferente do stage `deps` — evita contenção em build paralelo
RUN --mount=type=cache,id=oliveto-api-npm-prod,target=/root/.npm \
    npm ci --omit=dev && \
    npx prisma generate

COPY --from=builder --chown=node:node /app/dist ./dist

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD node -e "require('net').connect(8080,'127.0.0.1').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]