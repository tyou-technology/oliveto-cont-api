# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx nest build && npx prisma generate

# Falha o build se dist/main.js não existir
RUN test -f dist/main.js || (echo "❌ dist/main.js not found! Check tsconfig outDir." && exit 1)

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/dist ./dist

RUN npx prisma generate

# Confirma que o artefato chegou na stage final
RUN test -f dist/main.js || (echo "❌ dist/main.js missing in production stage!" && exit 1)

EXPOSE 8080
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]