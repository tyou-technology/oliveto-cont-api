# Oliveto API — Project Guide

## Overview

REST API for Oliveto accounting firm. Handles user management, authentication, blog articles, and lead capture. Built with **NestJS 10 + Prisma 5 + PostgreSQL 16**. API responses in English; content fields (article body, lead messages) in **Brazilian Portuguese**.

```
oliveto-api/
├── src/
│   ├── main.ts                    # Bootstrap, global pipes, CORS
│   ├── app.module.ts              # Root module
│   ├── common/                    # Shared decorators, guards, filters, pipes, DTOs
│   └── modules/
│       ├── auth/                  # JWT auth, login, register, refresh token
│       ├── users/                 # User CRUD, profile, role management
│       ├── articles/              # Blog CRUD, publish, slug lookup
│       ├── leads/                 # Lead capture (public) + management (admin)
│       ├── mail/                  # Transactional emails via Resend
│       └── prisma/                # Global PrismaService
├── prisma/
│   ├── schema.prisma              # Single source of truth
│   ├── migrations/
│   └── seed.ts
├── test/                          # Jest unit + Supertest E2E
├── docker-compose.yml             # Local Postgres + Redis
├── Dockerfile
└── .env.example
```

**Cross-service dependencies:** `LeadsService` → `MailService`. `AuthService` → `UsersService`.

---

## Tech Stack

| Component  | Technology                                     |
| ---------- | ---------------------------------------------- |
| Framework  | NestJS 10, TypeScript 5                        |
| Database   | PostgreSQL 16 + Prisma 5                       |
| Auth       | Passport.js — JWT + Local strategies           |
| Validation | class-validator + class-transformer            |
| Email      | Resend SDK                                     |
| Cache      | Redis (rate limiting, refresh token blacklist) |
| Testing    | Jest + Supertest                               |
| Docs       | Swagger (`@nestjs/swagger`)                    |
| Deploy     | Docker + Railway / Fly.io / VPS                |
| Monitoring | Sentry                                         |

---

## Environment Variables

| Variable                   | Purpose                      | Default / Example                                  |
| -------------------------- | ---------------------------- | -------------------------------------------------- |
| `NODE_ENV`                 | Runtime environment          | `development`                                      |
| `PORT`                     | API port                     | `3001`                                             |
| `DATABASE_URL`             | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/accounting` |
| `REDIS_URL`                | Redis connection             | `redis://localhost:6379`                           |
| `JWT_SECRET`               | Access token signing secret  | min 32 chars                                       |
| `JWT_EXPIRES_IN`           | Access token TTL             | `15m`                                              |
| `JWT_REFRESH_SECRET`       | Refresh token signing secret | min 32 chars                                       |
| `JWT_REFRESH_EXPIRES_IN`   | Refresh token TTL            | `7d`                                               |
| `CORS_ORIGIN`              | Allowed CORS origin(s)       | `http://localhost:3000`                            |
| `RESEND_API_KEY`           | Resend API key               | `re_xxxxxxxxxxxx`                                  |
| `FROM_EMAIL`               | Default sender email         | `contato@yourfirm.com.br`                          |
| `ADMIN_NOTIFICATION_EMAIL` | New-lead alert destination   | `admin@yourfirm.com.br`                            |
| `SENTRY_DSN`               | Sentry error tracking        | `https://xxx@sentry.io/yyy`                        |
| `THROTTLE_TTL`             | Rate limiter window (ms)     | `60000`                                            |
| `THROTTLE_LIMIT`           | Max requests per window      | `60`                                               |

> Never commit sensitive values. Use `.env` locally; secrets manager in production. Copy `.env.example` to `.env` on setup.

---

## Module Structure Convention

Each feature is a self-contained NestJS module with a consistent internal layout. No service reaches into another module's internals.

| Folder             | Purpose                                                             | Required |
| ------------------ | ------------------------------------------------------------------- | -------- |
| `constants/`       | Centralized constants, message keys, route paths                    | Yes      |
| `dto/`             | Input/output contracts — suffix `Request` / `Response`, never `DTO` | Yes      |
| `entity/`          | Direct Prisma model mirrors (only visible to Service + Repo)        | Yes      |
| `enum/`            | Fixed business domain enumerations                                  | Optional |
| `exception/`       | Custom domain exceptions                                            | Yes      |
| `mapper/`          | Manual object conversion (entity → response)                        | Yes      |
| `repository/`      | Data access abstraction                                             | Yes      |
| `resource/`        | REST controllers                                                    | Yes      |
| `resource/client/` | External service clients                                            | Optional |
| `service/`         | Business rules                                                      | Yes      |
| `types/`           | TypeScript interfaces and type aliases — never inline               | Yes      |
| `utils/`           | Helpers (last resort — prefer domain service or mapper)             | Optional |
| `validation/`      | Custom validators / annotations                                     | Optional |

**Common types** (`src/common/`):

```
common/
├── constants/
│   ├── error-messages.ts        # DB-level error messages
│   ├── prisma-error-codes.ts    # P2002, P2025, P2003
│   └── wide-event.constants.ts
└── types/
    ├── enums.ts                      # Role, LeadStatus, ArticleStatus, LeadOrigin
    └── authenticated-request.type.ts # Express Request + user: JwtPayload
```

**Module-scoped types example:**

```
src/modules/auth/types/
├── token-pair.type.ts       # { accessToken: string; refreshToken: string }
└── jwt-payload.type.ts      # { sub: string; email: string; role: Role }
```

---

## Design Patterns

### 1. No Literal Strings in Implementation Code

All messages, error strings, Prisma codes, log action names, and route paths must live in constants.

```typescript
// ✅
throw new NotFoundException(USER_ERROR_MESSAGES.USER_NOT_FOUND);
if (err?.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) { ... }
@Controller(USERS_ROUTES.BASE)

// ❌
throw new NotFoundException('User not found');
if (err?.code === 'P2002') { ... }
@Controller('users')
```

### 2. DTO Validation Wall

Every request goes through a DTO with `class-validator` decorators. The global `ValidationPipe` rejects bad input before reaching any service. Services trust their inputs.

### 3. Response Envelope + HATEOAS

`TransformInterceptor` wraps all successful responses. Every response includes a `_links.self` object.

```typescript
// Single resource
{ "data": { ... }, "_links": { "self": { "href": "/articles/slug/my-article", "method": "GET" }, "collection": { ... } } }

// Paginated list
{ "data": [...], "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }, "_links": { "self": { ... } } }

// Error
{ "error": { "statusCode": 400, "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

**HTTP status codes:**

| Operation             | Status | Body               |
| --------------------- | ------ | ------------------ |
| GET (found)           | 200    | `{ data, _links }` |
| POST (create)         | 201    | `{ data, _links }` |
| PATCH/PUT             | 200    | `{ data, _links }` |
| DELETE                | 204    | _(none)_           |
| POST logout / no-body | 204    | _(none)_           |

Auth endpoints (`/auth/register`, `/auth/login`, `/auth/refresh`) return token pairs directly — no `_links`.

**HATEOAS links by resource:**

| Resource    | `_links` keys                                   |
| ----------- | ----------------------------------------------- |
| Article     | `self`, `collection`                            |
| Tag         | `self`, `collection`                            |
| Lead        | `self`, `collection`, `status`, `notes`, `read` |
| User (me)   | `self`, `update`                                |
| User (role) | `self`, `collection`                            |

**Controller pattern:**

```typescript
// Single resource
async findBySlug(@Param('slug') slug: string) {
  const article = await this.articlesService.findBySlug(slug);
  return {
    data: article,
    _links: {
      self:       { href: `/articles/slug/${slug}`, method: 'GET' },
      collection: { href: '/articles',              method: 'GET' },
    },
  };
}

// Paginated list — spread from service result
async listArticles(@Query() query: ArticleQueryDto) {
  const result = await this.articlesService.list(query);
  return { ...result, _links: { self: { href: '/articles', method: 'GET' } } };
}

// Delete — 204, no body
@HttpCode(HttpStatus.NO_CONTENT)
async deleteArticle(@Param('id') id: string): Promise<void> {
  await this.articlesService.delete(id);
}
```

### 4. Role-Based Access Control (RBAC)

Global `JwtAuthGuard` protects all routes. Use `@Public()` to opt out; `@Roles(Role.ADMIN)` for restricted routes.

```typescript
@Public()
@Post()
createLead(@Body() dto: CreateLeadRequest) { ... }

@Roles(Role.ADMIN)
@Get()
listLeads(@Query() query: LeadQueryRequest) { ... }
```

### 5. Prisma Exception Mapping

`PrismaExceptionFilter` maps Prisma errors globally — no try/catch boilerplate in services.

| Prisma Code | HTTP Status | Meaning                     |
| ----------- | ----------- | --------------------------- |
| P2002       | 409         | Unique constraint violation |
| P2025       | 404         | Record not found            |
| P2003       | 400         | Foreign key violation       |

### 6. Config Module

All configuration via `ConfigService.get()`. No `process.env` calls in the codebase. Startup validation via Joi.

---

## Software Engineering Rules

**Naming** — Reveal intent. Classes: nouns. Methods: verbs. No disinformation, no `cooperativesList` if it's not a list.

**SRP** — Functions do one thing. Max 20 lines, max 2 indentation levels. Same abstraction level throughout.

**Arguments** — Prefer 0–2 args. Max 3. Group related params into an `Input`/`Request` object. No boolean flag args.

**Comments** — Explain _why_, never _what_. Refactor unclear code instead of commenting it.

**Constants** — No magic strings or numbers in business logic. Everything in named constants.

**No `any`** — Explicitly type every method's return value, every parameter. Use `unknown` + narrowing if shape is unknown at design time.

**No Utility Classes** — Avoid static method helpers. Check if logic belongs to a domain entity or injectable service first.

**DRY vs. Accidental Duplication** — Abstract shared business rules. Tolerate duplication between code that changes for different reasons.

**Fail Fast** — Guard clauses at entry points. Throw specific business exceptions.

**Law of Demeter** — Avoid `A.getB().getC().doSomething()`. Encapsulate behavior in the object that owns the data.

**Tell, Don't Ask** — Don't extract state from objects to make decisions externally. Put the logic where the data lives.

**KISS & YAGNI** — Simplest solution that solves the current problem. No speculative abstractions.

**Boy Scout Rule** — Leave code better than you found it. Fix naming and formatting as you go.

**Boundary Isolation** — HTTP requests and Prisma entities must not leak into core business logic. Map at the edges.

---

## Common Hurdles & Solutions

### CORS errors from the front-end

`CORS_ORIGIN` must include the protocol (`http://` or `https://`). Set `credentials: true` in `enableCors()`.

### Prisma Client out of sync

Always run `npx prisma generate` + `npx prisma migrate dev` together after schema changes. Add `prisma generate` to the `build` script.

### Duplicate article slug

```typescript
async generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true });
  const exists = await this.prisma.article.findUnique({ where: { slug: base } });
  return exists ? `${base}-${Date.now()}` : base;
}
```

### Refresh token replay after logout

Store the token's `jti` in a Redis blacklist (TTL = remaining token lifetime). Validate against blacklist before issuing a new pair.

### Rate limiting not working behind a reverse proxy

```typescript
app.getHttpAdapter().getInstance().set('trust proxy', 1); // main.ts
```

### N+1 on article list with author

Always use `include` or `select` explicitly for relation data:

```typescript
this.prisma.article.findMany({
  include: { author: { select: { id: true, name: true, avatarUrl: true } } },
});
```

### Email sending blocks the request

Fire-and-forget — don't await `MailService`:

```typescript
this.mailService
  .sendNewLeadAlert(lead)
  .catch((err) => this.logger.error('Failed to send lead alert email', err));
```

---

## Logging — Wide Events

One structured JSON event per request. No scattered `console.log`. Build context throughout the request; emit once in `WideEventInterceptor`.

**Core principles:**

1. One event per request with all relevant fields.
2. High cardinality: include `user_id`, `request_id`, `lead_id`, `article_slug`.
3. Never log passwords, tokens, CPFs, or full emails — mask with `maskEmail()` / `maskPhone()`.
4. Use concrete values: `error.code: "P2002"`, not `"something went wrong"`.
5. Log business context, not implementation details.

**Enriching from services:**

```typescript
function enrichEvent(req: Request, context: Record<string, unknown>): void {
  Object.assign(req['wideEvent'], context);
}
```

**Wide event example — successful login:**

```json
{
  "timestamp": "2025-03-10T14:23:01.412Z",
  "request_id": "req_8f7a2b3c",
  "service": "accounting-api",
  "method": "POST",
  "path": "/auth/login",
  "status_code": 200,
  "duration_ms": 187,
  "outcome": "success",
  "ip": "187.12.34.56",
  "auth": {
    "action": "login",
    "method": "local",
    "user_id": "clx7abc123",
    "user_role": "ADMIN",
    "token_expires_in": "15m"
  }
}
```

**DB query context** (via Prisma middleware):

```json
{
  "db": {
    "query_count": 3,
    "total_ms": 45,
    "slowest_ms": 28,
    "slowest_model": "Article",
    "slowest_action": "findMany",
    "slow_query_detected": false
  }
}
```

**Enrichment blocks per module:**

| Module   | Key fields                                                                       |
| -------- | -------------------------------------------------------------------------------- |
| Auth     | `action`, `method`, `user_id`, `user_role`, `token_expires_in`, `failure_reason` |
| Users    | `action`, `user_id`, `target_user_id`, `role_change`                             |
| Articles | `action`, `article_id`, `slug`, `status`                                         |
| Leads    | `action`, `lead_id`, `service_interest`, `source`, `has_phone`, `message_length` |

**Tail sampling (production):**

```typescript
function shouldStore(event: Record<string, unknown>): boolean {
  if (event.status_code >= 400) return true;
  if (event.duration_ms > 1000) return true;
  if (event.db?.slow_query_detected) return true;
  if (event.user?.role === 'ADMIN') return true;
  if (event.lead?.id) return true;
  return Math.random() < 0.1; // sample 10% of healthy requests
}
```

---

## Testing

```
test/
├── app.e2e-spec.ts
├── jest-e2e.json
└── modules/
    ├── users/    # users.controller.spec.ts, users.service.spec.ts
    ├── articles/
    └── ...       # one spec per controller/service
```

**Always use path aliases** — never deep relative paths:

```typescript
import { PaginationQueryDto } from '@common/dto/pagination.dto';
import { UsersService } from '@modules/users/users.service';
```

**Service spec pattern:**

```typescript
// Fixtures
const mockUser = { id: 'cuid_1', email: '...', passwordHash: '...', role: 'ADMIN' };
const safeUser = (overrides = {}) => {
  const u = { ...mockUser, ...overrides };
  delete u.passwordHash;
  return u;
};

// Prisma error helpers
const prismaP2002 = () => Object.assign(new Error('Unique constraint'), { code: 'P2002' });
const prismaP2025 = () => Object.assign(new Error('Record not found'), { code: 'P2025' });
const dbError = () => new Error('Connection refused');

// Prisma mock
const mockPrisma = { user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } };
```

**Required scenarios per method:**

| Type       | Examples                                            |
| ---------- | --------------------------------------------------- |
| Happy path | Expected data, correct Prisma args, pagination meta |
| Not found  | `null` from Prisma → `NotFoundException`            |
| Conflict   | P2002 → `ConflictException`                         |
| DB error   | Generic error propagates as-is                      |
| Security   | `passwordHash` never appears in any return value    |

**Commands:**

```bash
npm run test          # Unit tests
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
npm run test:e2e      # E2E tests
```

---

## Dev Setup

```bash
git clone <repo-url> && cd accounting-api
npm install
cp .env.example .env      # fill in local values
docker compose up -d      # Postgres + Redis
npx prisma migrate dev
npx prisma db seed
npm run start:dev         # http://localhost:8080
npx prisma studio         # http://localhost:5555
```

---

## Post-Implementation Checklist

### Code & Tests

- [ ] Unit + E2E tests pass
- [ ] Tests written for new/changed functionality
- [ ] ESLint + Prettier: no warnings
- [ ] No `console.log` / `debugger` leftovers
- [ ] Swagger decorators on new endpoints

### Database

- [ ] Migration created, applied, and reversible
- [ ] `prisma generate` run after schema change
- [ ] Indexes added for new query patterns
- [ ] Seed updated if needed

### API

- [ ] DTOs with `class-validator` for all new inputs
- [ ] `@Public()` / `@Roles()` correctly set
- [ ] Rate limiting on public endpoints
- [ ] Responses follow the envelope pattern
- [ ] Edge cases handled: duplicate slug, missing relations, invalid status transitions

### Security

- [ ] No secrets in code or logs
- [ ] Passwords hashed with bcrypt (cost ≥ 10)
- [ ] Separate JWT secrets for access and refresh tokens
- [ ] Refresh token rotation implemented

### Deploy & Infra

- [ ] New env vars added to production + documented in `.env.example`
- [ ] Docker build succeeds
- [ ] Health check responds 200 (`GET /health`)
- [ ] `prisma migrate deploy` runs successfully in production

### Monitoring & Docs

- [ ] No new Sentry errors after deploy
- [ ] Logs contain no sensitive data
- [ ] `CLAUDE.md`, `.env.example`, and CHANGELOG updated
- [ ] Swagger docs reflect new/changed endpoints

---

> **Last updated:** 2026-03-06 · **Maintainer:** @caetanojpo
