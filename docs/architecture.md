# Technical Architecture — MyGarden

This document describes the technical architecture for the MyGarden application. It is derived from the [PRD](./mygarden_prd.md) and should be kept in sync as decisions evolve.

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client (Browser)                       │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  React SPA    │  │ Service      │  │  IndexedDB           │  │
│  │  (TypeScript) │  │ Worker (PWA) │  │  (offline queue)     │  │
│  └──────┬────────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                     │              │
└─────────┼──────────────────┼─────────────────────┼──────────────┘
          │ HTTPS            │ cache/sync           │
          ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Scaleway Serverless Container                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Node.js Backend (v24, TS)                │   │
│  │  ┌────────┐  ┌────────────┐  ┌──────────────────────┐   │   │
│  │  │ Routes │→ │  Services  │→ │  Repository Layer     │   │   │
│  │  │ (API)  │  │ (business  │  │  (abstract interface) │   │   │
│  │  │        │  │  logic)    │  │                       │   │   │
│  │  └────────┘  └────────────┘  └──────┬───────┬────────┘   │   │
│  │                                     │       │            │   │
│  │  ┌────────────────────────┐         │       │            │   │
│  │  │ Static file server     │         │       │            │   │
│  │  │ (serves React build)   │         │       │            │   │
│  │  └────────────────────────┘         │       │            │   │
│  └─────────────────────────────────────┼───────┼────────────┘   │
└────────────────────────────────────────┼───────┼────────────────┘
                                         │       │
                          ┌──────────────┘       └──────────────┐
                          ▼                                     ▼
              ┌───────────────────────┐          ┌──────────────────────┐
              │  Scaleway Managed     │          │  Scaleway Object     │
              │  MongoDB              │          │  Storage (S3)        │
              │                       │          │                      │
              │  - users              │          │  - plant photos      │
              │  - gardens            │          │  - garden photos     │
              │  - areas              │          │  - attachments       │
              │  - plantings          │          │                      │
              │  - logs, tasks, etc.  │          │                      │
              └───────────────────────┘          └──────────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Technology

| Concern | Choice |
|---|---|
| Framework | React 19+ with TypeScript |
| Build tool | Vite |
| Routing | React Router |
| State management | React Query (TanStack Query) for server state; React context or Zustand for local UI state |
| Styling | Tailwind CSS (utility-first, responsive out of the box) |
| i18n | react-i18next with namespace-based JSON translation files |
| PWA | Vite PWA plugin (vite-plugin-pwa) backed by Workbox |
| Offline storage | IndexedDB via idb (thin wrapper) for queued mutations |
| HTTP client | Fetch API wrapped in a thin client with auth header injection |

### 2.2 Project Structure

```
frontend/
├── public/
│   ├── locales/
│   │   ├── en/
│   │   │   └── translation.json
│   │   └── nb/
│   │       └── translation.json
│   └── manifest.json
├── src/
│   ├── api/              # API client functions (one file per domain)
│   ├── components/       # Shared UI components
│   ├── features/         # Feature modules (garden-map, planting, calendar, …)
│   │   ├── garden-map/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   ├── planting/
│   │   ├── logging/
│   │   ├── calendar/
│   │   ├── plant-profiles/
│   │   ├── seasons/
│   │   └── auth/
│   ├── hooks/            # Shared hooks
│   ├── layouts/          # Page layouts (sidebar, header, etc.)
│   ├── lib/              # Utilities, constants, types
│   ├── offline/          # Service worker registration, sync queue
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

### 2.3 PWA & Offline Strategy

The app is delivered as a PWA and must work in the garden where connectivity may be spotty.

**Service worker caching (Workbox):**
- **App shell** — precached on install (HTML, JS, CSS, fonts, icons)
- **API responses** — stale-while-revalidate for read endpoints (garden data, plant profiles); network-first for mutations
- **Static assets** — cache-first with versioned URLs

**Offline mutation queue:**
1. When the user performs a write action (log activity, update planting, etc.) while offline, the mutation is serialized to IndexedDB with a timestamp.
2. When connectivity returns, the service worker triggers a background sync event.
3. The sync handler replays queued mutations in order against the API.
4. Conflict resolution: **last-write-wins** by timestamp. The server accepts the write if its timestamp is newer than the current value; otherwise it discards it.

**Offline-available flows:**
- View garden map, areas, and plantings (cached data)
- Log activities (queued)
- View calendar and tasks (cached data)
- Create/edit notes (queued)

**Requires connectivity:**
- User registration and login
- Initial data load after login

### 2.4 Internationalization

- All user-facing strings are externalized into JSON files under `public/locales/{lang}/`.
- Two namespaces at minimum: `translation` (general UI) and `plants` (plant-related terminology).
- Language detection: browser language → user preference stored in profile → fallback to `nb`.
- Date and number formatting via the `Intl` API, locale-aware.

---

## 3. Backend Architecture

### 3.1 Technology

| Concern | Choice |
|---|---|
| Runtime | Node.js v24 with TypeScript |
| Framework | Express.js (widely supported, mature middleware ecosystem) |
| Validation | Zod (schema validation for request bodies and query params) |
| Auth | JWT access tokens (short-lived) + refresh tokens (HTTP-only cookie) |
| Password hashing | bcrypt |
| MongoDB driver | Mongoose (ODM with schema validation, migration-friendly) |
| Object storage | AWS SDK v3 S3 client (compatible with Scaleway Object Storage) |
| Logging | pino (structured JSON logging) |
| Testing | Vitest + supertest for integration tests |

### 3.2 Project Structure

```
backend/
├── src/
│   ├── config/            # Environment config, validation
│   ├── middleware/         # Auth, error handling, request logging, i18n
│   ├── modules/           # Feature modules
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.validation.ts
│   │   ├── gardens/
│   │   │   ├── garden.routes.ts
│   │   │   ├── garden.service.ts
│   │   │   ├── garden.repository.ts     # implements interface
│   │   │   └── garden.validation.ts
│   │   ├── areas/
│   │   ├── plantings/
│   │   ├── logs/
│   │   ├── tasks/
│   │   ├── plant-profiles/
│   │   ├── seasons/
│   │   ├── notes/
│   │   └── files/
│   ├── repositories/      # Abstract repository interfaces
│   │   ├── interfaces/
│   │   │   ├── garden.repository.interface.ts
│   │   │   ├── planting.repository.interface.ts
│   │   │   └── ...
│   │   └── mongodb/       # MongoDB implementations
│   │       ├── garden.repository.mongodb.ts
│   │       └── ...
│   ├── models/            # Mongoose schemas / domain types
│   ├── lib/               # Shared utilities
│   ├── app.ts             # Express app setup
│   └── server.ts          # Entry point
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

### 3.3 Layered Architecture

Each request flows through three layers:

```
HTTP Request
    │
    ▼
┌──────────┐   Validates input, calls service, formats response
│  Route    │   No business logic here.
│  Handler  │
└────┬─────┘
     │
     ▼
┌──────────┐   Orchestrates business rules, authorization checks,
│  Service  │   calls one or more repositories. Framework-agnostic.
│           │
└────┬─────┘
     │
     ▼
┌──────────┐   Abstract interface. Concrete implementations for
│Repository│   MongoDB (now) or PostgreSQL/other (future).
│          │   No business logic here — pure data access.
└──────────┘
```

**Dependency injection:** Services receive repository instances via constructor injection. A simple DI container (or factory module) wires concrete implementations at startup. This makes it trivial to swap a MongoDB repository for a PostgreSQL one, or an in-memory mock for tests.

### 3.4 Authentication & Authorization

**Invite-only registration:**

Registration is restricted to email addresses that have been pre-approved by the app owner. This is enforced via an `AllowedEmail` collection in the database (see [data_model.md](./data_model.md)). The flow:

1. The app owner adds an email address to the allowlist (via a CLI command, a seed script, or a future admin UI).
2. When a user attempts to register, the auth service checks the email against the allowlist. If the email is not found, registration is rejected with a clear error message.
3. Once approved, the user registers with email + password. Password is hashed with bcrypt.

**Login & token flow:**
1. On login, the server returns a short-lived JWT access token (e.g., 15 min) in the response body and a long-lived refresh token (e.g., 7 days) as an HTTP-only secure cookie.
2. The frontend stores the access token in memory (not localStorage) and attaches it as a `Bearer` token on API requests.
3. When the access token expires, the frontend calls `/auth/refresh` to get a new one using the cookie.

**Authorization:**
- All API endpoints (except auth) require a valid access token.
- Garden-level authorization: the service layer checks that the requesting user is a member of the garden being accessed.
- Role-based: Owner vs. Member permissions enforced in the service layer (post-MVP, when collaboration is added).

### 3.5 API Design

RESTful JSON API. All endpoints are prefixed with `/api/v1`.

**Core resources:**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account (email must be on the allowlist) |
| POST | `/auth/login` | Login, receive tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate refresh token |
| GET | `/admin/allowed-emails` | List pre-approved emails (owner only) |
| POST | `/admin/allowed-emails` | Add email to allowlist (owner only) |
| DELETE | `/admin/allowed-emails/:id` | Remove email from allowlist (owner only) |
| GET | `/users/me` | Get current user profile |
| PATCH | `/users/me` | Update profile (name, language preference) |
| GET | `/gardens` | List user's gardens |
| POST | `/gardens` | Create a garden |
| GET | `/gardens/:gardenId` | Get garden details |
| PATCH | `/gardens/:gardenId` | Update garden (name, grid size) |
| DELETE | `/gardens/:gardenId` | Delete garden (owner only) |
| GET | `/gardens/:gardenId/areas` | List areas |
| POST | `/gardens/:gardenId/areas` | Create area |
| PATCH | `/gardens/:gardenId/areas/:areaId` | Update area |
| DELETE | `/gardens/:gardenId/areas/:areaId` | Delete area |
| GET | `/gardens/:gardenId/seasons` | List seasons |
| POST | `/gardens/:gardenId/seasons` | Create season |
| PATCH | `/gardens/:gardenId/seasons/:seasonId` | Update season |
| GET | `/gardens/:gardenId/plantings?seasonId=` | List plantings for a season |
| POST | `/gardens/:gardenId/plantings` | Create planting |
| PATCH | `/gardens/:gardenId/plantings/:plantingId` | Update planting |
| DELETE | `/gardens/:gardenId/plantings/:plantingId` | Delete planting |
| GET | `/gardens/:gardenId/logs?seasonId=` | List activity logs |
| POST | `/gardens/:gardenId/logs` | Create log entry |
| GET | `/gardens/:gardenId/tasks?seasonId=` | List tasks |
| POST | `/gardens/:gardenId/tasks` | Create manual task |
| PATCH | `/gardens/:gardenId/tasks/:taskId` | Update task (mark done) |
| GET | `/plant-profiles` | List user's plant profiles |
| POST | `/plant-profiles` | Create plant profile |
| PATCH | `/plant-profiles/:profileId` | Update plant profile |
| DELETE | `/plant-profiles/:profileId` | Delete plant profile |
| GET | `/gardens/:gardenId/notes?seasonId=` | List notes |
| POST | `/gardens/:gardenId/notes` | Create note |
| PATCH | `/gardens/:gardenId/notes/:noteId` | Update note |
| DELETE | `/gardens/:gardenId/notes/:noteId` | Delete note |
| POST | `/files/upload` | Upload file (proxied to Object Storage) |
| GET | `/files/:fileId` | Get file metadata / download URL |

**Conventions:**
- Pagination: `?page=1&limit=20` with response envelope `{ data: [...], meta: { page, limit, total } }`
- Errors: [RFC 9457 Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457) — responses use `Content-Type: application/problem+json` with `type`, `title`, `status`, `detail`, and optional `instance` / extension fields (e.g., `validationErrors` array for input errors)
- Timestamps: ISO 8601, UTC
- IDs: UUID v4 (application-generated, stored as string in MongoDB). This decouples IDs from the database engine and simplifies future migration to PostgreSQL or other stores.

### 3.6 File Upload Flow

```
Client                    Backend                     Scaleway Object Storage
  │                          │                                │
  │  POST /files/upload      │                                │
  │  (multipart/form-data)   │                                │
  │─────────────────────────>│                                │
  │                          │  Validate (type, size, auth)   │
  │                          │  Generate unique key            │
  │                          │  PutObject ──────────────────> │
  │                          │  <───────────── 200 OK ─────── │
  │                          │  Save file metadata to MongoDB │
  │  <── 201 { fileId, url } │                                │
```

- Max file size: 10 MB (configurable).
- Accepted types: JPEG, PNG, WebP.
- Files are stored with a key pattern: `uploads/{userId}/{gardenId}/{uuid}.{ext}`.
- The backend generates a time-limited signed URL for reads, so files are never publicly accessible.

---

## 4. Docker & Deployment

### 4.1 Docker Image

A single Docker image packages the entire application:

```dockerfile
# Multi-stage build
# Stage 1: Build frontend
FROM node:24-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm run build

# Stage 2: Build backend
FROM node:24-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY backend/ ./
RUN pnpm run build

# Stage 3: Production image
FROM node:24-alpine
WORKDIR /app
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=frontend-build /app/frontend/dist ./public
EXPOSE 8080
CMD ["node", "dist/server.js"]
```

The backend serves the React build as static files from `/public` and handles API routes under `/api/v1`. This keeps the deployment to a single container.

### 4.2 CI/CD Pipeline (GitHub Actions)

```
push to main
    │
    ▼
┌───────────────────┐
│  Lint & typecheck  │  (frontend + backend)
│  Run tests         │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Build Docker      │
│  image             │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Push to Scaleway  │
│  Container         │
│  Registry          │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Deploy to         │
│  Scaleway          │
│  Serverless        │
│  Containers        │
└───────────────────┘
```

**Environment configuration** is passed via environment variables in the Serverless Container settings:
- `MONGODB_URI` — connection string to Managed MongoDB
- `JWT_SECRET` — secret for signing JWTs
- `JWT_REFRESH_SECRET` — secret for refresh tokens
- `S3_ENDPOINT` — Scaleway Object Storage endpoint
- `S3_BUCKET` — bucket name
- `S3_ACCESS_KEY` / `S3_SECRET_KEY` — Object Storage credentials
- `NODE_ENV` — `production`
- `PORT` — `8080` (Scaleway default)

### 4.3 Future: Kubernetes Migration

When the application outgrows Serverless Containers (e.g., need for horizontal scaling, cron jobs, or multiple services), the same Docker image can be deployed to Scaleway Kapsule with:
- A Kubernetes Deployment + Service for the app container
- Horizontal Pod Autoscaler based on CPU/request count
- Kubernetes CronJob for scheduled tasks (e.g., task generation, cleanup)
- Ingress controller for TLS termination

No application code changes are needed for this migration — only infrastructure configuration.

---

## 5. Security

| Concern | Approach |
|---|---|
| **Transport** | HTTPS everywhere (Scaleway provides TLS termination) |
| **Authentication** | JWT with short expiry; refresh via HTTP-only secure cookie |
| **Password storage** | bcrypt with cost factor ≥ 12 |
| **Input validation** | Zod schemas on every endpoint; reject unknown fields |
| **Authorization** | Service-layer checks: user must be a garden member to access its data |
| **File uploads** | Type and size validation; files stored in private bucket with signed URLs |
| **Rate limiting** | Express rate-limit middleware on auth endpoints (prevent brute force) |
| **CORS** | Strict origin whitelist (the app's own domain) |
| **Dependencies** | Dependabot enabled; pnpm audit in CI |
| **Secrets** | Never committed to the repo; injected as environment variables |
| **GDPR** | Users can export and delete their data; minimal data collection |

---

## 6. Monitoring & Observability

For the initial personal/family use, lightweight monitoring is sufficient:

| Concern | Approach |
|---|---|
| **Application logs** | Structured JSON via pino; written to stdout (captured by Scaleway) |
| **Error tracking** | Uncaught exceptions and unhandled rejections logged with full context |
| **Health check** | `GET /health` returns `200` with `{ status: "ok", version: "..." }` — used by Scaleway for liveness probes |
| **Uptime** | Scaleway Serverless Containers provides basic availability metrics |

Post-MVP, if needed: integrate Scaleway Cockpit for dashboards, or add Sentry for frontend error tracking.

---

## 7. Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| **Unit tests** | Vitest | Services and utility functions; repositories mocked via interfaces |
| **Integration tests** | Vitest + supertest | API routes against an in-memory MongoDB (mongodb-memory-server) |
| **Frontend unit** | Vitest + React Testing Library | Component behavior and hooks |
| **E2E tests** | Playwright | Critical user flows (register, create garden, log activity) — post-MVP |

**CI runs all unit and integration tests on every push.** E2E tests run on PRs targeting `main`.

---

## 8. Monorepo Structure

```
minhage/
├── docs/                  # PRD, architecture, data model
├── frontend/              # React PWA
├── backend/               # Node.js API
├── docker/
│   └── Dockerfile         # Multi-stage build
├── .github/
│   └── workflows/
│       ├── ci.yml         # Lint, test on push/PR
│       └── deploy.yml     # Build, push, deploy on main
├── package.json           # Root workspace config
├── pnpm-workspace.yaml    # pnpm workspace definition
├── tsconfig.base.json     # Shared TypeScript config
└── README.md
```

The repository uses **pnpm workspaces** to manage `frontend/` and `backend/` as packages in a monorepo. Shared TypeScript types (e.g., API request/response shapes) can live in a `shared/` workspace if needed.
