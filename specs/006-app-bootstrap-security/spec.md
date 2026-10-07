# Feature Specification: Express application bootstrap with security middleware

**Feature Branch**: `006-app-bootstrap-security`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Implement GitHub issue #6 (https://github.com/jessiicamaru/task-management/issues/6): feat(api): Express application bootstrap with security middleware — createApp() factory (no singleton, no DB on import); middleware order with reasons: trust proxy 1, pino-http, helmet (CSP for Swagger UI, no COEP), cors from config with credentials (refuse * at startup), compression, json 100kb + urlencoded, health routes before auth/rate limit, /api/v1 router from src/routes/index.js, 404 then error handler last; server.js logs the bound address. Acceptance: independent createApp instances without DB; helmet headers and x-request-id on /healthz; 200 KB body → 413 in the project error shape; disallowed origin rejected, allowed accepted; CORS_ORIGINS=* fails at startup."

## User Scenarios & Testing *(mandatory)*

Users: API clients (the web app), operators, and contributors adding modules.

### User Story 1 - Safe defaults on every response (Priority: P1)

Every response carries security headers and a request id; oversized bodies are refused with a
proper error instead of exhausting the instance.

**Independent Test**: `GET /healthz` shows helmet headers and `x-request-id`; a 200 KB JSON body
returns 413 in the error shape.

**Acceptance Scenarios**:

1. **Given** any request, **When** answered, **Then** `x-content-type-options: nosniff` and the other helmet headers are present, plus `x-request-id`, and `x-powered-by` is absent.
2. **Given** a JSON body over 100 KB, **When** posted, **Then** the response is 413 with `{ "error": { "code", "message", "details", "requestId" } }`.
3. **Given** an unknown route, **When** requested, **Then** the response is 404 in the same shape (not HTML).
4. **Given** an unexpected error, **When** it reaches the handler, **Then** the response is 500 with a generic message and nothing from the original error.

---

### User Story 2 - Browser access only from known origins (Priority: P1)

The web app's origin can call the API with credentials; other origins cannot.

**Acceptance Scenarios**:

1. **Given** an allowed origin, **When** it sends a request or preflight, **Then** CORS headers allow it with credentials.
2. **Given** a disallowed origin, **When** it sends a request or preflight, **Then** no CORS allow headers are returned, so the browser blocks it.
3. **Given** `CORS_ORIGINS=*`, **When** the service starts, **Then** it fails with a message explaining that `*` is invalid with credentials.

---

### User Story 3 - One place to mount modules (Priority: P2)

A contributor adds a module router with one line in `src/routes/index.js`; `createApp()` can be
called repeatedly in tests without side effects.

**Acceptance Scenarios**:

1. **Given** two `createApp()` calls, **Then** they return independent apps and no database connection is opened.
2. **Given** the API router, **Then** it is mounted at `/api/v1`.

### Edge Cases

- Behind Render's proxy, `req.ip` must be the client, not the proxy — but a forged `X-Forwarded-For` beyond one hop must not be trusted.
- A malformed JSON body → 400 in the error shape, not an HTML stack page.
- Requests without an `Origin` header (curl, server-to-server) are unaffected by CORS.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `createApp()` MUST be a side-effect-free factory accepting injected `logger` and `config`.
- **FR-002**: Middleware order MUST be: trust proxy (1 hop) → request logging → security headers → CORS → compression → body parsing (JSON 100 KB, urlencoded non-extended) → health routes → `/api/v1` router → 404 → error handler; each step commented with its reason.
- **FR-003**: Security headers via helmet with a CSP that permits the Swagger UI (#32) and COEP disabled.
- **FR-004**: CORS MUST allow only configured origins with credentials; `*` MUST be refused at startup in every environment.
- **FR-005**: 404 and errors MUST use the shape `{ error: { code, message, details, requestId } }`; client errors from body parsing keep their 4xx status; anything else is a generic 500.
- **FR-006**: `src/routes/index.js` MUST build the `/api/v1` router.
- **FR-007**: The server MUST log the bound address on startup.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of responses (including 404/413/500) carry helmet headers and a request id.
- **SC-002**: A body over 100 KB never reaches a handler.
- **SC-003**: 0 CORS allow headers returned to a disallowed origin.

## Assumptions

- **Changes #4's default**: `CORS_ORIGINS` no longer defaults to `*` outside production; it defaults to `http://localhost:5173` (the Vite dev server) and `*` is refused everywhere, because credentials are always on.
- A disallowed origin gets no CORS headers (browser-enforced) rather than a server-side 403: the Swagger UI (#32) is served from the API's own origin and sends an `Origin` header.
- The error handler here is the minimal version of #7's shape; #7 adds `AppError`, zod and pg mapping, and the 4xx/5xx logging rules.
- `/api/v1` path versioning, as the backlog assumes.
- The temporary `GET /` stays until health routes (#8) replace it.
