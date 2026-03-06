# Oliveto API - Project Guide

## Project Overview

REST API for Oliveto accounting firm. Handles user management, authentication, blog articles (content marketing), and lead capture from the website contact form. Built with NestJS, Prisma, and PostgreSQL. All API responses in English; content fields (article body, lead messages) in **Brazilian Portuguese**.

```
oliveto-api/
├── src/
│   ├── main.ts                          # NestJS bootstrap, global pipes, CORS
│   ├── app.module.ts                    # Root module — imports all feature modules
│   ├── common/                          # Shared decorators, guards, filters, pipes, DTOs
│   └── modules/
│       ├── auth/                        # JWT auth, login, register, refresh token
│       ├── users/                       # User CRUD, profile, role management
│       ├── articles/                    # Blog articles — CRUD, publish, slug lookup
│       ├── leads/                       # Lead capture (public), lead management (admin)
│       ├── mail/                        # Transactional emails via Resend
│       └── prisma/                      # Global PrismaService, connection handling
├── prisma/
│   ├── schema.prisma                    # Database schema (single source of truth)
│   ├── migrations/                      # Migration history
│   └── seed.ts                          # Dev seed data (admin user, sample articles)
├── test/                                # Unit and E2E tests (Jest + Supertest)
├── docker-compose.yml                   # Local Postgres + Redis
├── Dockerfile                           # Multi-stage production build
├── .env.example                         # All env vars documented
├── nest-cli.json
└── tsconfig.json
```

Cross-service dependencies: `LeadsService` → `MailService` (notifies admin on new lead). `ArticlesService` is self-contained. `AuthService` → `UsersService` (user lookup and creation).

---

## Tech Stack

| Component  | Technology                                     |
| ---------- | ---------------------------------------------- |
| Framework  | NestJS 10, TypeScript 5                        |
| Database   | PostgreSQL 16                                  |
| ORM        | Prisma 5 (schema at `prisma/schema.prisma`)    |
| Auth       | Passport.js — JWT strategy + Local strategy    |
| Validation | class-validator + class-transformer            |
| Email      | Resend SDK                                     |
| Cache      | Redis (rate limiting, refresh token blacklist) |
| Testing    | Jest (unit) + Supertest (e2e)                  |
| Docs       | Swagger via `@nestjs/swagger`                  |
| Deploy     | Docker + [Railway / Fly.io / VPS]              |
| CI/CD      | GitHub Actions                                 |
| Monitoring | Sentry                                         |
| Linting    | ESLint + Prettier                              |

---

## Environment Variables

| Variable                   | Purpose                           | Example / Default                                  |
| -------------------------- | --------------------------------- | -------------------------------------------------- |
| `NODE_ENV`                 | Runtime environment               | `development` / `production`                       |
| `PORT`                     | API port                          | `3001`                                             |
| `DATABASE_URL`             | PostgreSQL connection string      | `postgresql://user:pass@localhost:5432/accounting` |
| `REDIS_URL`                | Redis connection                  | `redis://localhost:6379`                           |
| `JWT_SECRET`               | Secret for signing access tokens  | (secret, min 32 chars)                             |
| `JWT_EXPIRES_IN`           | Access token TTL                  | `15m`                                              |
| `JWT_REFRESH_SECRET`       | Secret for signing refresh tokens | (secret, min 32 chars)                             |
| `JWT_REFRESH_EXPIRES_IN`   | Refresh token TTL                 | `7d`                                               |
| `CORS_ORIGIN`              | Allowed CORS origin(s)            | `http://localhost:3000`                            |
| `RESEND_API_KEY`           | Resend API key for emails         | `re_xxxxxxxxxxxx`                                  |
| `FROM_EMAIL`               | Default sender email              | `contato@yourfirm.com.br`                          |
| `ADMIN_NOTIFICATION_EMAIL` | Where new-lead alerts are sent    | `admin@yourfirm.com.br`                            |
| `SENTRY_DSN`               | Sentry DSN for error tracking     | `https://xxx@sentry.io/yyy`                        |
| `THROTTLE_TTL`             | Rate limiter window (ms)          | `60000`                                            |
| `THROTTLE_LIMIT`           | Max requests per window           | `60`                                               |

> Sensitive values never committed. Use `.env` locally, secrets manager in production (e.g., Railway variables, Doppler). Copy `.env.example` to `.env` when setting up.

---

## Directory Structure — Detailed

```
src/
├── main.ts
├── app.module.ts
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts      # @CurrentUser() — extracts user from JWT payload
│   │   ├── public.decorator.ts            # @Public() — skips JwtAuthGuard on a route
│   │   └── roles.decorator.ts             # @Roles(Role.ADMIN) — sets required roles metadata
│   ├── guards/
│   │   ├── jwt-auth.guard.ts              # Global guard — validates Bearer token
│   │   └── roles.guard.ts                 # Checks user role against @Roles() metadata
│   ├── filters/
│   │   ├── http-exception.filter.ts       # Standardizes error envelope
│   │   └── prisma-exception.filter.ts     # Maps Prisma errors (P2002, P2025) to HTTP status
│   ├── interceptors/
│   │   ├── transform.interceptor.ts       # Wraps all responses in { data, meta } envelope
│   │   └── logging.interceptor.ts         # Logs request method, URL, duration
│   ├── pipes/
│   │   └── validation.pipe.ts             # Global ValidationPipe config (whitelist, transform)
│   └── dto/
│       ├── pagination.dto.ts              # PaginationQueryDto (page, limit, sort)
│       └── api-response.dto.ts            # Generic ApiResponseDto<T> for Swagger
│
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts             # POST /auth/register, /login, /refresh, /logout
│   │   ├── auth.service.ts                # Password hashing, JWT issue/verify, refresh logic
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts            # Validates access token, injects user into request
│   │   │   └── local.strategy.ts          # Validates email + password on login
│   │   ├── guards/
│   │   │   └── jwt-refresh.guard.ts       # Validates refresh token specifically
│   │   └── dto/
│   │       ├── login.dto.ts               # { email, password }
│   │       ├── register.dto.ts            # { name, email, password }
│   │       └── token-response.dto.ts      # { accessToken, refreshToken }
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts            # GET /users/me, PATCH /users/me, GET /users (admin)
│   │   ├── users.service.ts               # findByEmail, findById, create, update, list
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   │
│   ├── articles/
│   │   ├── articles.module.ts
│   │   ├── articles.controller.ts         # Full CRUD + GET /articles/slug/:slug + PATCH publish
│   │   ├── articles.service.ts            # CRUD, unique slug generation, status transitions
│   │   └── dto/
│   │       ├── create-article.dto.ts
│   │       ├── update-article.dto.ts
│   │       └── article-query.dto.ts       # Filters: status, tag, search, pagination
│   │
│   ├── leads/
│   │   ├── leads.module.ts
│   │   ├── leads.controller.ts            # POST /leads (public), GET/PATCH /leads (admin)
│   │   ├── leads.service.ts               # Create, updateStatus, addNotes, list with filters
│   │   └── dto/
│   │       ├── create-lead.dto.ts
│   │       ├── update-lead-status.dto.ts
│   │       └── lead-query.dto.ts          # Filters: status, dateRange, pagination
│   │
│   ├── mail/
│   │   ├── mail.module.ts
│   │   ├── mail.service.ts               # sendNewLeadAlert(), sendWelcomeEmail()
│   │   └── templates/                     # Email HTML templates (handlebars or string literals)
│   │
│   └── prisma/
│       ├── prisma.module.ts               # Global module (exports PrismaService)
│       └── prisma.service.ts              # extends PrismaClient, onModuleInit, onModuleDestroy
```

---

## Models (Prisma Schema)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  EDITOR
  USER
}

enum LeadStatus {
  NEW
  CONTACTED
  QUALIFIED
  CONVERTED
  LOST
}

enum ArticleStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  passwordHash  String    @map("password_hash")
  role          Role      @default(USER)
  avatarUrl     String?   @map("avatar_url")
  articles      Article[]
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@map("users")
}

model Article {
  id              String        @id @default(cuid())
  title           String
  slug            String        @unique
  excerpt         String?
  content         String        @db.Text
  coverUrl        String?       @map("cover_url")
  status          ArticleStatus @default(DRAFT)
  publishedAt     DateTime?     @map("published_at")
  author          User          @relation(fields: [authorId], references: [id])
  authorId        String        @map("author_id")
  tags            String[]      @default([])
  seoTitle        String?       @map("seo_title")
  seoDescription  String?       @map("seo_description")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@index([status, publishedAt])
  @@index([slug])
  @@map("articles")
}

model Lead {
  id            String     @id @default(cuid())
  name          String
  email         String
  phone         String?
  company       String?
  service       String?                            // e.g. "company_formation", "tax_filing"
  message       String?    @db.Text
  status        LeadStatus @default(NEW)
  source        String?                            // "website", "google", "referral"
  notes         String?    @db.Text                // Internal agent notes
  contactedAt   DateTime?  @map("contacted_at")
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")

  @@index([status])
  @@index([createdAt])
  @@map("leads")
}
```

---

## API Endpoints

### Auth (`/auth`)

| Method | Route            | Auth    | Description                            |
| ------ | ---------------- | ------- | -------------------------------------- |
| POST   | `/auth/register` | Public  | Create account, returns token pair     |
| POST   | `/auth/login`    | Public  | Login with email + password            |
| POST   | `/auth/refresh`  | Refresh | Renew access token using refresh token |
| POST   | `/auth/logout`   | Bearer  | Blacklist refresh token                |

### Users (`/users`)

| Method | Route             | Auth   | Description                |
| ------ | ----------------- | ------ | -------------------------- |
| GET    | `/users/me`       | Bearer | Get current user profile   |
| PATCH  | `/users/me`       | Bearer | Update own profile         |
| GET    | `/users`          | Admin  | List all users (paginated) |
| PATCH  | `/users/:id/role` | Admin  | Change a user's role       |

### Articles (`/articles`)

| Method | Route                   | Auth    | Description                         |
| ------ | ----------------------- | ------- | ----------------------------------- |
| GET    | `/articles`             | Public  | List published articles (paginated) |
| GET    | `/articles/slug/:slug`  | Public  | Single article by slug              |
| POST   | `/articles`             | Editor+ | Create article (defaults to DRAFT)  |
| PATCH  | `/articles/:id`         | Editor+ | Update article                      |
| DELETE | `/articles/:id`         | Admin   | Delete article                      |
| PATCH  | `/articles/:id/publish` | Editor+ | Set status PUBLISHED + publishedAt  |
| PATCH  | `/articles/:id/archive` | Editor+ | Set status ARCHIVED                 |

### Leads (`/leads`)

| Method | Route               | Auth   | Description                       |
| ------ | ------------------- | ------ | --------------------------------- |
| POST   | `/leads`            | Public | Capture lead from website form    |
| GET    | `/leads`            | Admin  | List leads (filterable by status) |
| GET    | `/leads/:id`        | Admin  | Lead detail                       |
| PATCH  | `/leads/:id/status` | Admin  | Update lead status                |
| PATCH  | `/leads/:id/notes`  | Admin  | Add internal notes                |

---

## Services — Responsibilities

| Module     | Service           | Key Methods                                                                                        |
| ---------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| `auth`     | `AuthService`     | `register()`, `login()`, `refresh()`, `logout()`, `hashPassword()`, `validateUser()`               |
| `users`    | `UsersService`    | `findByEmail()`, `findById()`, `create()`, `update()`, `list()`                                    |
| `articles` | `ArticlesService` | `create()`, `update()`, `findBySlug()`, `publish()`, `archive()`, `list()`, `generateUniqueSlug()` |
| `leads`    | `LeadsService`    | `create()`, `updateStatus()`, `addNotes()`, `list()`, `findById()`                                 |
| `mail`     | `MailService`     | `sendNewLeadAlert()`, `sendWelcomeEmail()`                                                         |
| `prisma`   | `PrismaService`   | Extends `PrismaClient`, `onModuleInit()`, `onModuleDestroy()`                                      |

### Service call graph

```
AuthController
  └── AuthService
        ├── UsersService.findByEmail()    # login validation
        ├── UsersService.create()         # registration
        └── bcrypt / JWT sign             # internal

LeadsController
  └── LeadsService
        └── MailService.sendNewLeadAlert()  # on create

ArticlesController
  └── ArticlesService                       # self-contained

UsersController
  └── UsersService                          # self-contained
```

---

## Common Hurdles & Solutions

### 1. CORS errors from the front-end

**Symptom:** Browser blocks requests; Postman works fine.
**Cause:** `CORS_ORIGIN` misconfigured or missing protocol.
**Solution:**

```typescript
// main.ts
app.enableCors({
  origin: configService.get('CORS_ORIGIN'), // must include http:// or https://
  credentials: true,
});
```

### 2. Prisma Client out of sync after schema changes

**Symptom:** TypeScript errors on new fields, or runtime `Unknown field` errors.
**Cause:** Forgot to run `prisma generate` after editing `schema.prisma`.
**Solution:**

```bash
npx prisma generate                          # regenerate client types
npx prisma migrate dev --name describe_change # create + apply migration
```

Always run both commands together. Add `"prisma:generate": "prisma generate"` to the `build` script in `package.json` so deploys always regenerate.

### 3. Duplicate slug on article creation

**Symptom:** `Unique constraint failed on the fields: (slug)` (Prisma P2002).
**Cause:** Two articles with the same title produce the same slug.
**Solution:**

```typescript
async generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true });
  const exists = await this.prisma.article.findUnique({ where: { slug: base } });
  return exists ? `${base}-${Date.now()}` : base;
}
```

The `PrismaExceptionFilter` should also catch P2002 globally and return a `409 Conflict`.

### 4. Refresh token replay after logout

**Symptom:** Logged-out user can still use old refresh token to get a new access token.
**Cause:** Refresh token was not invalidated server-side.
**Solution:** On logout, store the refresh token's `jti` (JWT ID) in a Redis blacklist with a TTL matching the token's remaining lifetime. On refresh, check the blacklist before issuing a new pair.

### 5. Rate limiting not working behind a reverse proxy

**Symptom:** All requests show the same IP; rate limiter blocks everyone at once.
**Cause:** NestJS sees the proxy IP instead of the real client IP.
**Solution:**

```typescript
// main.ts
const app = await NestFactory.create(AppModule);
app.getHttpAdapter().getInstance().set('trust proxy', 1);
```

Then `@nestjs/throttler` will read `X-Forwarded-For` correctly.

### 6. N+1 queries on article list with author

**Symptom:** Listing 20 articles fires 21 queries (1 list + 20 author lookups).
**Cause:** Prisma doesn't eager-load relations by default.
**Solution:**

```typescript
this.prisma.article.findMany({
  where: { status: 'PUBLISHED' },
  include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  orderBy: { publishedAt: 'desc' },
  take: limit,
  skip: offset,
});
```

Always use `include` or `select` explicitly when the response needs relation data.

### 7. Email sending blocks the request

**Symptom:** `POST /leads` takes 2-3 seconds because it waits for the Resend API.
**Cause:** `MailService.sendNewLeadAlert()` is called synchronously in the request cycle.
**Solution:** Fire-and-forget with error logging:

```typescript
// leads.service.ts
async create(dto: CreateLeadDto) {
  const lead = await this.prisma.lead.create({ data: dto });

  // non-blocking — don't await
  this.mailService.sendNewLeadAlert(lead).catch((err) => {
    this.logger.error('Failed to send lead alert email', err);
  });

  return lead;
}
```

For production scale, consider a proper job queue (BullMQ).

---

## Testing

All tests live in `test/`, mirroring the `src/` module structure:

```
test/
├── app.e2e-spec.ts              # Top-level E2E smoke test
├── jest-e2e.json                # E2E Jest config
└── modules/
    ├── users/
    │   ├── users.controller.spec.ts
    │   └── users.service.spec.ts
    ├── articles/
    │   ├── articles.controller.spec.ts
    │   └── articles.service.spec.ts
    └── ...                      # One spec file per controller/service
```

### Import aliases

Test files must use the `@common/*` and `@modules/*` path aliases — never deep relative paths like `../../../src/...`:

```typescript
import { PaginationQueryDto } from '@common/dto/pagination.dto';
import { Role } from '@common/types/enums';
import { UsersService } from '@modules/users/users.service';
import { PrismaService } from '@modules/prisma/prisma.service';
```

Jest resolves these via `moduleNameMapper` in `package.json`. The same aliases are defined in `tsconfig.json` `paths`.

### Test structure conventions

Each service spec follows this pattern:

```typescript
// 1. Fixtures at the top — one mockUser, one safeUser helper that strips passwordHash
const mockUser = { id: 'cuid_1', email: '...', passwordHash: '...', ... };

const safeUser = (overrides: Record<string, unknown> = {}) => {
  const user: Record<string, unknown> = { ...mockUser, ...overrides };
  delete user.passwordHash;
  return user;
};

// 2. Prisma error factory helpers
const prismaP2002 = () => Object.assign(new Error('Unique constraint'), { code: 'P2002', ... });
const prismaP2025 = () => Object.assign(new Error('Record not found'), { code: 'P2025' });
const dbError = () => new Error('Connection refused');

// 3. Prisma mock object
const mockPrisma = { user: { findUnique: jest.fn(), create: jest.fn(), ... } };
```

Every method must cover both **happy** and **bad** scenarios:

| Scenario type | Examples                                                         |
| ------------- | ---------------------------------------------------------------- |
| Happy path    | Returns expected data, correct Prisma call args, pagination meta |
| Not found     | Prisma returns `null` → `NotFoundException`                      |
| Conflict      | Prisma P2002 → `ConflictException`                               |
| DB error      | Generic error → propagates as-is (no swallowing)                 |
| Security      | `passwordHash` never appears in any return value                 |

### Running tests

```bash
npm run test          # Unit tests (test/**/*.spec.ts)
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
npm run test:e2e      # E2E tests (test/**/*.e2e-spec.ts)
```

---

## Design Patterns

### 1. Module Encapsulation

Each feature is a self-contained NestJS module with its own controller, service, and DTOs. Modules declare explicit dependencies via `imports` and expose functionality via `exports`. No service reaches into another module's internals.

```typescript
@Module({
  imports: [PrismaModule, MailModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
```

### 2. DTO Validation Wall

Every request body and query param goes through a DTO with `class-validator` decorators. The global `ValidationPipe` rejects bad input before it reaches any service. This is the single point of input validation — services trust their inputs.

```typescript
export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsPhoneNumber('BR')
  phone?: string;

  @IsOptional()
  @IsIn(['company_formation', 'tax_filing', 'consulting', 'other'])
  service?: string;

  @IsOptional()
  @MaxLength(1000)
  message?: string;
}
```

### 3. Response Envelope

The `TransformInterceptor` wraps all successful responses in a consistent envelope. Error responses follow the same structure via the `HttpExceptionFilter`.

```typescript
// Success
{ "data": { ... }, "meta": { "page": 1, "limit": 10, "total": 42 } }

// Error
{ "error": { "statusCode": 400, "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

### 4. Role-Based Access Control (RBAC)

Global `JwtAuthGuard` protects all routes by default. Public routes opt out with `@Public()`. Admin/editor routes add `@Roles(Role.ADMIN)`. The `RolesGuard` reads role metadata and checks the JWT payload.

```typescript
@Public()
@Post()
createLead(@Body() dto: CreateLeadDto) { ... }

@Roles(Role.ADMIN)
@Get()
listLeads(@Query() query: LeadQueryDto) { ... }
```

### 5. Prisma Exception Mapping

A global `PrismaExceptionFilter` catches Prisma-specific errors and maps them to proper HTTP responses, so services don't need try/catch boilerplate for common DB errors.

| Prisma Code | HTTP Status | Meaning                     |
| ----------- | ----------- | --------------------------- |
| P2002       | 409         | Unique constraint violation |
| P2025       | 404         | Record not found            |
| P2003       | 400         | Foreign key violation       |

### 6. Config Module

All configuration comes from env vars, accessed through NestJS `ConfigService`. No `process.env` calls scattered in the codebase — only `ConfigService.get()`. Validation at startup via `Joi` or `class-validator` schema to fail fast on missing vars.

---

## Logging — Wide Events / Canonical Log Lines

This project follows the **wide event** philosophy (ref: [loggingsucks.com](https://loggingsucks.com/)). Instead of scattering `console.log` / `Logger.log` calls across the codebase, we emit **one rich, structured event per request** at the end of the request lifecycle. That single event contains every piece of context needed to debug, alert, and analyze — no grep-ing, no guessing.

### Core Principles

1. **One event per request, per service.** Not 15 log lines — one JSON object with 30+ fields.
2. **High cardinality.** Always include `user_id`, `request_id`, `lead_id`, `article_slug` — the values that actually distinguish one request from another.
3. **High dimensionality.** The more fields, the more questions you can answer. Add business context, not just HTTP metadata.
4. **Build throughout, emit once.** Accumulate context as the request flows through guards, pipes, and services. Emit the final event in a single interceptor at the very end.
5. **Never log sensitive data.** No passwords, tokens, CPFs, full credit card numbers. Mask or omit.

### Implementation: `WideEventInterceptor`

The logging interceptor wraps every request. It initializes the event with HTTP context, lets the route handler enrich it via `request.wideEvent`, and emits it in `finally`.

```typescript
// src/common/interceptors/wide-event.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class WideEventInterceptor implements NestInterceptor {
  private readonly logger = new Logger('WideEvent');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    // Initialize the wide event — attached to the request object
    req['wideEvent'] = {
      timestamp: new Date().toISOString(),
      request_id: req.headers['x-request-id'] || randomUUID(),
      service: 'accounting-api',
      version: process.env.npm_package_version || '0.0.0',
      node_env: process.env.NODE_ENV,

      // HTTP context
      method: req.method,
      path: req.route?.path || req.path,
      url: req.originalUrl,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
    };

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse<Response>();
        this.emit(req, res.statusCode, startTime, 'success');
      }),
      catchError((error) => {
        this.emit(req, error.status || 500, startTime, 'error', error);
        return throwError(() => error);
      }),
    );
  }

  private emit(req: Request, statusCode: number, startTime: number, outcome: string, error?: any) {
    const event = req['wideEvent'];
    event.status_code = statusCode;
    event.duration_ms = Date.now() - startTime;
    event.outcome = outcome;

    if (error) {
      event.error = {
        type: error.name || error.constructor?.name || 'UnknownError',
        message: error.message,
        code: error.code,
      };
    }

    // Emit as structured JSON — one line, all context
    if (statusCode >= 500) {
      this.logger.error(JSON.stringify(event));
    } else if (statusCode >= 400) {
      this.logger.warn(JSON.stringify(event));
    } else {
      this.logger.log(JSON.stringify(event));
    }
  }
}
```

Register globally in `main.ts`:

```typescript
app.useGlobalInterceptors(new WideEventInterceptor());
```

### Enriching Events from Services

Any controller or service can add business context to the current request's wide event. Use the `@Req()` decorator or pass the event as a parameter.

```typescript
// Helper to enrich the wide event from anywhere with access to the request
function enrichEvent(req: Request, context: Record<string, unknown>) {
  Object.assign(req['wideEvent'], context);
}
```

### What Each Module Logs

#### Auth Module

```typescript
// auth.service.ts — inside login()
enrichEvent(req, {
  auth: {
    action: 'login',
    method: 'local', // "local", "refresh"
    user_id: user.id,
    user_role: user.role,
    token_expires_in: '15m',
  },
});

// On failure:
enrichEvent(req, {
  auth: {
    action: 'login',
    failure_reason: 'invalid_password', // or "user_not_found", "account_disabled"
  },
});
```

Wide event example — successful login:

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

#### Leads Module

```typescript
// leads.service.ts — inside create()
enrichEvent(req, {
  lead: {
    id: lead.id,
    service_interest: dto.service, // "company_formation", "tax_filing"
    source: dto.source, // "website", "google", "referral"
    has_phone: !!dto.phone,
    has_company: !!dto.company,
    message_length: dto.message?.length || 0,
  },
  mail: {
    admin_alert_sent: true, // or false if fire-and-forget failed
  },
});
```

Wide event example — new lead captured:

```json
{
  "timestamp": "2025-03-10T15:01:44.871Z",
  "request_id": "req_2d4f6a8b",
  "service": "accounting-api",
  "method": "POST",
  "path": "/leads",
  "status_code": 201,
  "duration_ms": 342,
  "outcome": "success",
  "ip": "201.45.67.89",
  "lead": {
    "id": "clx9def456",
    "service_interest": "tax_filing",
    "source": "google",
    "has_phone": true,
    "has_company": true,
    "message_length": 240
  },
  "mail": {
    "admin_alert_sent": true
  }
}
```

#### Articles Module

```typescript
// articles.service.ts — inside publish()
enrichEvent(req, {
  article: {
    id: article.id,
    slug: article.slug,
    action: 'publish', // "create", "update", "publish", "archive", "delete"
    status_from: 'DRAFT',
    status_to: 'PUBLISHED',
    tags: article.tags,
    word_count: article.content.split(/\s+/).length,
    has_cover: !!article.coverUrl,
    has_seo: !!(article.seoTitle && article.seoDescription),
  },
  user: {
    id: currentUser.id,
    role: currentUser.role,
  },
});
```

#### Users Module

```typescript
// users.service.ts — inside update()
enrichEvent(req, {
  user: {
    id: targetUser.id,
    role: targetUser.role,
    action: 'profile_update', // "profile_update", "role_change", "list"
    fields_changed: ['name', 'avatarUrl'], // which fields were actually modified
  },
});
```

### Database Query Context

Add Prisma query timing to the wide event for slow query detection. Use a Prisma middleware:

```typescript
// src/modules/prisma/prisma.service.ts
this.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;

  // Store query stats — the interceptor will pick them up
  if (!this.currentRequestEvent) return result;

  if (!this.currentRequestEvent.db) {
    this.currentRequestEvent.db = { query_count: 0, total_ms: 0, slowest_ms: 0 };
  }
  this.currentRequestEvent.db.query_count++;
  this.currentRequestEvent.db.total_ms += duration;
  if (duration > this.currentRequestEvent.db.slowest_ms) {
    this.currentRequestEvent.db.slowest_ms = duration;
    this.currentRequestEvent.db.slowest_model = params.model;
    this.currentRequestEvent.db.slowest_action = params.action;
  }

  // Flag slow queries (> 500ms)
  if (duration > 500) {
    this.currentRequestEvent.db.slow_query_detected = true;
  }

  return result;
});
```

This adds a `db` block to the wide event:

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

### Full Wide Event Example — Error Case

A lead submission that fails validation at the database level:

```json
{
  "timestamp": "2025-03-10T16:45:12.003Z",
  "request_id": "req_c3e5g7i9",
  "service": "accounting-api",
  "version": "1.2.0",
  "node_env": "production",

  "method": "POST",
  "path": "/leads",
  "url": "/leads",
  "status_code": 409,
  "duration_ms": 89,
  "outcome": "error",
  "ip": "177.88.99.10",
  "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",

  "lead": {
    "service_interest": "company_formation",
    "source": "website",
    "has_phone": false,
    "has_company": false,
    "message_length": 0
  },

  "db": {
    "query_count": 1,
    "total_ms": 12,
    "slowest_ms": 12,
    "slowest_model": "Lead",
    "slowest_action": "create",
    "slow_query_detected": false
  },

  "error": {
    "type": "PrismaClientKnownRequestError",
    "message": "Unique constraint failed on the fields: (email)",
    "code": "P2002"
  }
}
```

One event, full picture: you instantly know it was a duplicate email from an iPhone user on the website, trying to ask about company formation, with no phone or company info provided. No second search needed.

### Tail Sampling (Production Cost Control)

At scale, store 100% of errors/slow requests, sample the rest:

```typescript
function shouldStore(event: Record<string, any>): boolean {
  // Always keep errors
  if (event.status_code >= 400) return true;

  // Always keep slow requests (> 1s)
  if (event.duration_ms > 1000) return true;

  // Always keep slow DB queries
  if (event.db?.slow_query_detected) return true;

  // Always keep admin actions
  if (event.user?.role === 'ADMIN') return true;

  // Always keep new lead captures (business-critical)
  if (event.lead?.id) return true;

  // Sample 10% of the rest (healthy GETs, etc.)
  return Math.random() < 0.1;
}
```

### Rules

1. **Never `console.log` directly.** All context goes into `req.wideEvent`. The interceptor handles emission.
2. **Never log passwords, tokens, CPFs, or full emails.** Mask sensitive fields: `email: maskEmail(dto.email)` → `j***@gmail.com`.
3. **Always include the `request_id`.** Passed via `X-Request-Id` header or auto-generated. This correlates front-end errors to back-end events.
4. **Use concrete values, not vague messages.** Not `"something went wrong"` — instead: `error.code: "P2002"`, `error.type: "PrismaClientKnownRequestError"`.
5. **Log business context, not implementation details.** `lead.service_interest: "tax_filing"` is useful. `"Entering LeadsService.create()"` is noise.
6. **Every new module must define its enrichment block** in this document before implementation.

---

## Post-Implementation Checklist

### Code & Tests

- [ ] All unit tests pass (`npm run test`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] New tests written for added/changed functionality
- [ ] ESLint + Prettier with no warnings (`npm run lint`)
- [ ] No leftover `console.log` / `debugger` statements
- [ ] Swagger decorators added to new endpoints

### Database

- [ ] Migration created and applied (`prisma migrate dev`)
- [ ] `prisma generate` executed after schema change
- [ ] Migration is reversible (test `prisma migrate reset` in dev)
- [ ] Seed updated if needed (`prisma db seed`)
- [ ] Indexes added for frequent query patterns

### API

- [ ] DTOs with `class-validator` decorators for all new inputs
- [ ] `@Public()` / `@Roles()` correctly set on new routes
- [ ] Rate limiting on public endpoints (leads, auth)
- [ ] Responses follow the envelope pattern (`data` / `error`)
- [ ] Edge cases handled: duplicate slug, missing relations, invalid status transitions

### Security

- [ ] No secrets in code or logs
- [ ] Passwords hashed with bcrypt (cost factor ≥ 10)
- [ ] JWT secrets are different for access and refresh tokens
- [ ] Refresh token rotation implemented (old token invalidated on use)
- [ ] CORS origin set to the actual front-end domain in production

### Deploy & Infra

- [ ] New env vars added to production environment
- [ ] Env vars documented in `.env.example` and this `CLAUDE.md`
- [ ] Docker build succeeds (`docker build .`)
- [ ] Health check endpoint responds 200 (`GET /health`)
- [ ] Migration runs successfully in production (`prisma migrate deploy`)

### Monitoring

- [ ] No new errors in Sentry after deploy
- [ ] Logs don't expose sensitive data (passwords, tokens, CPFs)
- [ ] Response times haven't degraded

### Documentation

- [ ] This `CLAUDE.md` updated with relevant changes
- [ ] `.env.example` updated with new variables
- [ ] CHANGELOG entry added
- [ ] Swagger docs reflect the new/changed endpoints

---

## Dev Setup (Quick Start)

```bash
# 1. Clone and install
git clone <repo-url> && cd accounting-api
npm install

# 2. Environment
cp .env.example .env
# Fill in your local values

# 3. Start Postgres + Redis
docker compose up -d

# 4. Database setup
npx prisma migrate dev
npx prisma db seed

# 5. Run
npm run start:dev        # http://localhost:8080
npx prisma studio        # http://localhost:5555 (DB browser)
```

**Useful commands:**

```bash
npm run start:dev        # Dev with hot reload
npm run build            # Production build
npm run test             # Unit tests
npm run test:e2e         # E2E tests
npm run lint             # Lint + format check
npx prisma studio        # Visual DB browser
npx prisma migrate dev   # Create + apply migration
npx prisma generate      # Regenerate client after schema change
```

---

> **Last updated:** 2026-03-05
> **Maintainer:** @caetanojpo
