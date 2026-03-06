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
│   ├── example/
│   │   ├── example.module.ts
│   │   ├── constants/
│   │   │   └── example.constants.ts          # example: Role labels, default pagination, message keys, routes
│   │   ├── dto/
│   │   │   ├── create-example.request.ts     # example: { name, email, password, role? }
│   │   │   ├── update-example.request.ts     # example: { name?, avatarUrl? }
│   │   │   ├── example.response.ts           # example: Public example representation (no passwordHash)
│   │   │   └── example-list-query.request.ts # example: Pagination + role filter
│   │   ├── entity/
│   │   │   └── example.entity.ts             # example — id, email, name, passwordHash, role
│   │   ├── enum/
│   │   │   └── role.enum.ts               # example: ADMIN, EDITOR, example
│   │   ├── exception/
│   │   │   ├── example-not-found.exception.ts
│   │   │   └── email-already-exists.exception.ts
│   │   ├── mapper/
│   │   │   └── example.mapper.ts             # Entity → exampleResponse (strips sensitive fields)
│   │   ├── repository/
│   │   │   └── example.repository.ts         # example: findByEmail, findById, create, update, list
│   │   ├── resource/
│   │   │   └── example.controller.ts      # example: GET /example/list, PATCH /example, GET /example (admin)
│   │   └── service/
│   │       └── example.service.ts         # example: Profile updates, role changes, example lookup
│   ├── .../
│   ├── mail/
│   │   ├── mail.module.ts
│   │   ├── constants/
│   │   │   └── mail.constants.ts          # Template names, subject line keys
│   │   ├── dto/
│   │   │   └── send-email.request.ts      # { to, subject, templateName, variables }
│   │   ├── service/
│   │   │   └── mail.service.ts            # sendNewLeadAlert(), sendWelcomeEmail()
│   │   └── resource/
│   │       └── client/
│   │           └── resend.client.ts       # Resend SDK wrapper — send(), config
│   │
│   └── prisma/
│       ├── prisma.module.ts               # Global module (exports PrismaService)
│       └── prisma.service.ts              # extends PrismaClient, onModuleInit, onModuleDestroy
```

---

### Service call graph example

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

### 0. No Literal Strings in Implementation Code

All user-facing messages, error strings, Prisma error codes, log action names, and route paths must live in constants, never inline. This ensures consistent messages, makes refactoring safe, and prevents typos causing silent mismatches.

```
src/common/constants/
├── error-messages.ts        # Human-facing exception messages
├── prisma-error-codes.ts    # Prisma P-codes (P2002, P2025, P2003)
├── routes.ts                # Route path segments for every controller
└── wide-event.constants.ts  # Log action names, service name, logger context
```

```typescript
// ✅ correct
throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
if (err?.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT) { ... }
enrichEvent(req, { user: { action: USER_ACTIONS.PROFILE_UPDATE } });

@Controller(ROUTES.USERS.BASE)
...
@Get(ROUTES.USERS.ME)
...
@Patch(ROUTES.USERS.ROLE)

// ❌ wrong — never do this
throw new NotFoundException('User not found');
if (err?.code === 'P2002') { ... }
enrichEvent(req, { user: { action: 'profile_update' } });

@Controller('users')
...
@Get('me')
...
@Patch(':id/role')
```

Route constants live in `src/common/constants/routes.ts` and follow this shape:

```typescript
export const ROUTES = {
  AUTH: {
    BASE: 'auth',
    LOGIN: 'login',
    REGISTER: 'register',
    REFRESH: 'refresh',
    LOGOUT: 'logout',
  },
  USERS: {
    BASE: 'users',
    ME: 'me',
    ROLE: ':id/role',
  },
  ARTICLES: {
    BASE: 'articles',
    SLUG: 'slug/:slug',
    PUBLISH: ':id/publish',
    ARCHIVE: ':id/archive',
    BY_ID: ':id',
  },
  LEADS: {
    BASE: 'leads',
    BY_ID: ':id',
    STATUS: ':id/status',
    NOTES: ':id/notes',
  },
} as const;
```

### 1. Module Structure Convention

Each feature is a self-contained NestJS module following a consistent internal layout. The folder structure enforces separation of concerns — no file lives outside its designated layer. Modules declare explicit dependencies via `imports` and expose functionality via `exports`. No service reaches into another module's internals.

| Folder             | Purpose                                                                                      | Required |
| ------------------ | -------------------------------------------------------------------------------------------- | -------- |
| `constants/`       | Centralized constants and message keys (eg. ApiConstants, MessageConstants, RoutesConstants) | Yes      |
| `dto/`             | Input/output contracts — **no DTO suffix**, use `Request` and `Response`                     | Yes      |
| `entity/`          | Direct mapping to database tables (Prisma model mirrors). Only visible by Service and Repo   | Yes      |
| `enum/`            | Fixed business domain enumerations                                                           | Optional |
| `exception/`       | Custom domain exceptions                                                                     | Yes      |
| `mapper/`          | Object conversion (prefer manual mapping over libraries)                                     | Yes      |
| `modules/`         |                                                                                              | Yes      |
| `repository/`      | Data access abstraction and queries                                                          | Yes      |
| `resource/`        | REST controllers and contract validation                                                     | Yes      |
| `resource/client/` | External service integration clients                                                         | Optional |
| `resource/filter/` | HTTP request interceptors specific to this module                                            | Optional |
| `service/`         | Core business rules and application logic                                                    | Yes      |
| `utils/`           | Helper methods (last resort — prefer domain service, generic services or mapper)             | Optional |
| `validation/`      | Aggregated validators and custom annotations                                                 | Optional |

Each feature is a self-contained NestJS module with its own controller, service, and DTOs.

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
export class CreateLeadRequest {
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
createLead(@Body() dto: CreateLeadRequest) { ... }

@Roles(Role.ADMIN)
@Get()
listLeads(@Query() query: LeadQueryRequest) { ... }
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

### Software Engineering Best Practices

**1. Meaningful Naming**
Choose names that save reading time. Class, method, and variable names have an obligation to reveal their intent.

- **Reveal intention:** The name must answer why the variable exists, what it does, and how it is used.
- **Disallow disinformation:** Never use names that suggest something different from their real purpose (do not use `cooperativesList` if the type is not a list).
- **Use pronounceable and searchable names:** Standardize names that make sense within the business context to facilitate communication and code navigation.
- **Nouns and Verbs:** Name classes with nouns (e.g., `User`, `Lead`) and methods with verbs (e.g., `findUser`, `validatePassword`).

**2. Small and Specialized Functions (SRP)**
Strictly apply the Single Responsibility Principle (SRP). A function should do only one thing and do it well. Extensive methods are forbidden, as they hide bugs and prevent efficient unit testing.

- **Size and indentation limits:** Keep functions short (maximum limit of 20 lines). Restrict indentation to a maximum of two levels (an `if` inside a `for` inside an `if` is forbidden).
- **Standardize abstraction levels:** Keep all commands within a function at the same level of abstraction. Mixing high-level logic (e.g., `getUsersNames()`) with low-level logic (e.g., `string.append("-")`) is forbidden.
- **Simplify blocks and indentation:** Reduce blocks inside `if`, `else`, and `while` statements to a single line, which must necessarily be a function call.

**3. Function Arguments**
Reduce the number of arguments to the absolute minimum. Complex signatures increase cognitive load and make unit testing painful. Respect the hierarchy of purity: ideal is zero (niladic), followed by one (monadic), and two (dyadic). Avoid triadic methods (3 arguments). More than three arguments is strictly forbidden.

- **Create Input Objects:** When identifying a group of related data or a long list of parameters, you must encapsulate them into a single input data structure. This keeps the method interface stable even if new fields are added.
- **Mandatory suffixes:** These objects must be named with suffixes like `Input` or `Request`. The use of the generic `DTO` suffix is forbidden.
- **No Flag Arguments:** Passing booleans as arguments to alter the internal behavior of a function is forbidden. This proves the function is doing more than one thing and must be refactored into two distinct, semantic methods.

**4. Self-Documenting Code & Comments**
Do not try to compensate for bad code with comments. The code is the single source of truth; comments age, become liars, and are dangerous.

- **Prioritize the code:** Refactor confusing code instead of explaining it.
- **Restrict comments to intent:** Use comments exclusively to explain _why_ an atypical technical decision was made. Commenting on _what_ the code does is forbidden.

**5. Avoid Utility Classes**
The use of `Utils` classes with static methods is strongly discouraged. This practice incentivizes a procedural style, hinders maintenance, and makes clean unit testing via mocks impossible.

- **Exhaust architectural possibilities:** Before creating a new utility class, you must exhaust all architectural possibilities. Check if the logic doesn't actually belong to a domain entity or a specialized service.
- **Check standard libraries:** Before implementing utility logic, check if it doesn't already exist in established libraries available in the project. Do not reinvent the wheel; prefer community-tested solutions.
- **Use managed services:** If creation is truly necessary, replace static methods with injectable components.

**6. Constants and Magic Numbers**
Using hardcoded literals (numbers or strings) in the middle of business logic is forbidden. Magic values make the code fragile and hard to interpret.

- **Use constants:** Replace magic numbers, strings, and booleans with semantic constants.

**7. Vertical Formatting and Affinity**
Organize the code so that reading flows like a well-structured narrative.

- **Vertical density:** Keep related lines of code close to each other. Lines representing distinct thoughts should be separated by a blank line.
- **Vertical distance:** Declare variables as close as possible to where they will be used. Called functions should be placed immediately below the functions that call them (Step-down Rule).

**8. Simplicity and Waste (KISS & YAGNI)**
The design must focus on solving the current problem with the least possible complexity.

- **KISS (Keep It Simple, Stupid):** Prioritize the most direct and readable solution. It is forbidden to create interfaces for classes that only have one planned implementation in the short term, or to apply complex design patterns to trivial logic.
- **YAGNI (You Ain't Gonna Need It):** Implementing features, abstractions, or parameters "thinking about the future" is forbidden. Speculative code generates maintenance costs and unnecessary complexity.

**9. Law of Demeter (Principle of Least Knowledge)**
A module should not know the internal details of the objects it manipulates. An object should only talk to its close friends and never to strangers.

- **Encapsulate behavior:** It is forbidden for a class to navigate through chains of third-party objects to perform an action. This generates fragile coupling where any change to the internal structure of a dependency breaks multiple modules.
- **The Dot Rule:** Avoid multiple chained calls. If your code does `A.getB().getC().doSomething()`, you are violating the Law of Demeter.

**10. Fail Fast**
Validate all preconditions, parameters, and system states immediately at the beginning of execution. The code must fail as early as possible to avoid the unnecessary consumption of precious resources (like database connections, network calls, or CPU processing).

- **Guard Clauses:** Use early returns to handle invalid scenarios immediately.
- **Expressiveness:** Silent or generic returns that omit the cause of the error are forbidden. Throw specific business exceptions that describe exactly why it failed.

**11. Tell, Don't Ask**
Move decision-making logic to the objects that hold the data necessary to execute it. This principle is fundamental to avoiding Anemic Domain Models and ensuring a rich, cohesive domain.

- **Rule Encapsulation:** It is forbidden for services to ask for an object's state to perform an external calculation or alteration. Instruct the object to perform the action. The logic must live where the data resides.
- **Internal Validations:** If the properties to be validated belong to a domain entity, it is mandatory to perform the validation internally and expose only the resulting method.
- **No getters for logic:** Avoid overusing getters. If you are extracting data from an object to validate something about it, that validation belongs inside the object itself.

**12. Dependency Inversion & Injection (SOLID)**
High-level modules should not depend on low-level modules; both should depend on abstractions.

- **Invert the flow:** Business logic must not depend directly on database frameworks, external APIs, or UI components.
- **Inject dependencies:** Hardcoding instantiation of services inside a class (using the `new` keyword for complex objects) is forbidden. Pass dependencies through the constructor to ensure components are easily mockable and interchangeable.

**13. Boundary Isolation (Clean Architecture)**
Keep a strict division between your core domain and external delivery mechanisms.

- **Protect the Domain:** External frameworks, HTTP requests, and database entities must not leak into your core business logic.
- **Map data at the edges:** Always map external payloads (like HTTP requests or database rows) into pure domain objects before passing them to your core services.

**14. The Boy Scout Rule**
Always leave the code better than you found it.

- **Continuous Refactoring:** If you find bad formatting, poor naming, or outdated comments while implementing a new feature, you have an obligation to fix it. Do not wait for a dedicated "refactoring sprint."

**15. Don't Repeat Yourself (DRY) vs. Accidental Duplication**
Avoid duplicating business knowledge, but recognize when duplication is actually acceptable.

- **True DRY:** Never copy and paste core business rules. Abstract them into a single, cohesive location.
- **Tolerate Accidental Duplication:** If two pieces of code look identical right now but change for entirely different business reasons, forcing them into a shared abstraction is forbidden. Premature abstraction is worse than duplication.

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

Register globally in `main.ts`:

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

### Database Query Context

Add Prisma query timing to the wide event for slow query detection. Use a Prisma middleware:

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

This is an excellent, highly prescriptive set of guidelines. The rigorous tone is perfect for establishing a strong engineering culture, whether you are setting the standard for your development team or structuring material for a technical syllabus.

I have translated your list into professional software engineering English, refining a few redundant points (especially in item 11) for better flow. Below the translation, I’ve also included a few new topics that perfectly complement this approach, particularly if you are leaning into Clean Architecture and robust system design.

---

### Rules

1. **Never `console.log` directly.** All context goes into `req.wideEvent`. The interceptor handles emission.
2. **Never log passwords, tokens, CPFs, or full emails.** Mask sensitive fields using `maskEmail()` / `maskPhone()` from `@common/utils/mask.util`: `email: maskEmail(dto.email)` → `j***@gmail.com`.
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

> **Last updated:** 2026-03-06
> **Maintainer:** @caetanojpo
