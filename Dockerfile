# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

# Build only — migrations run at container startup, not at build time
RUN npx nest build && npx prisma generate

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && npm cache clean --force

# Bring the Prisma CLI from the builder so we can run `migrate deploy` at startup.
# prisma is a devDependency but is required at runtime to apply migrations.
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

COPY --from=builder /app/dist ./dist

# Regenerate the Prisma client against the production runtime
RUN npx prisma generate

EXPOSE 8080

# Apply pending migrations, then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
