# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

# Remove any stale incremental build cache — with "incremental: true" in tsconfig,
# a leftover .tsbuildinfo from the host tricks TypeScript into skipping compilation.
RUN rm -f *.tsbuildinfo

# Use the CLI binary directly (more reliable than npx in Alpine)
# Fail fast if dist/main.js is not produced
RUN node_modules/.bin/nest build && \
    node_modules/.bin/prisma generate && \
    test -f dist/main.js || (echo "❌ dist/main.js not found — nest build failed" && exit 1)

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
RUN node_modules/.bin/prisma generate && \
    test -f dist/main.js || (echo "❌ dist/main.js missing in production stage" && exit 1)

EXPOSE 8080

# Apply pending migrations, then start the server
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main"]
