# Feature Specification: Structured logging with request correlation

**Feature Branch**: `005-structured-logging`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Implement GitHub issue #5 (https://github.com/jessiicamaru/task-management/issues/5): feat(obs): structured logging with pino and per-request correlation ids — src/config/logger.js (level from config, pino-pretty in development, JSON otherwise, base service name), non-negotiable redaction (authorization, cookie, password, password_hash, token, refreshToken, accessToken, DATABASE_URL, JWT_SECRET), pino-http with x-request-id reuse or UUID v4, echoed on the response, 5xx error / 4xx warn / else info, health probes at debug; AsyncLocalStorage request context; one startup line with port, NODE_ENV, log level and the database host without credentials."

## User Scenarios & Testing *(mandatory)*

Users are operators diagnosing the running service through Render's log viewer (no shell access).

### User Story 1 - Trace one request across every log line (Priority: P1)

An operator takes the request id from a client error report or a response header and finds every
log line that request produced — including lines logged deep inside services.

**Why this priority**: Without correlation, concurrent requests interleave and a production problem
becomes guesswork.

**Independent Test**: Send `x-request-id: abc`; the response carries `x-request-id: abc` and the log
lines carry `"reqId":"abc"`. Without the header, a generated UUID appears in both.

**Acceptance Scenarios**:

1. **Given** a request with `x-request-id: abc`, **When** it is handled, **Then** logs contain `"reqId":"abc"` and the response header is `abc`.
2. **Given** no header, **When** handled, **Then** a UUID v4 is generated and appears in both.
3. **Given** code that logs without access to the request, **When** it runs during a request, **Then** its lines carry that request's id.
4. **Given** an incoming id with spaces or control characters, **When** handled, **Then** it is replaced by a generated id.

---

### User Story 2 - Logs never leak credentials (Priority: P1)

Passwords, tokens, auth headers, cookies, the database URL and the JWT secret never appear in any log line.

**Independent Test**: POST a login body with a password plus auth/cookie headers; grep the captured output.

**Acceptance Scenarios**:

1. **Given** a login request with a password, bearer token and cookie, **When** it is logged, **Then** none of the three values appears.
2. **Given** an object with nested credentials, **When** logged, **Then** they are censored as `[REDACTED]`.
3. **Given** startup, **When** the database is described, **Then** only host, port and database name are logged.

---

### User Story 3 - Signal over noise (Priority: P2)

Severity follows outcome (5xx error, 4xx warn, else info); health probes stay out of the default
level; Errors log with message and stack.

**Acceptance Scenarios**:

1. **Given** `LOG_LEVEL=info`, **When** a probe hits `/healthz`, **Then** nothing is logged; at `debug` it is.
2. **Given** an `Error` is logged, **When** output is read, **Then** it has message and stack, not `{}`.
3. **Given** the service starts, **Then** exactly one line reports port, environment, log level and database host.

### Edge Cases

- Development reads logs in a terminal (pretty); production must be one JSON object per line.
- A duplicate `reqId` key in one JSON line breaks some log parsers — must not happen.
- A failure to bind the port is logged as fatal before exit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: One logger factory; level from config; pretty output only in development; `service: task-management` on every line.
- **FR-002**: Redaction MUST cover the paths in issue #5 at any of the first two nesting levels.
- **FR-003**: Request ids: reuse a well-formed incoming `x-request-id` (≤128 chars, `[A-Za-z0-9_.:-]`), else UUID v4; always echoed as `x-request-id`.
- **FR-004**: Request completion level: 5xx/err → error, 4xx → warn, else info; `/healthz` and `/readyz` → debug.
- **FR-005**: A request context MUST make the request id available to, and attach it to log lines from, any code running during the request.
- **FR-006**: Startup MUST log once with port, environment, log level and the database host/port/name — no credentials.
- **FR-007**: Errors MUST serialise with type, message and stack.
- **FR-008**: No sampling.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of request log lines carry a request id that matches the response header.
- **SC-002**: 0 occurrences of test passwords, tokens or DB credentials in captured output.
- **SC-003**: At the default level, health-probe traffic produces 0 lines.

## Assumptions

- Header name is **`x-request-id`** (issue lists it first; #45's smoke test asserts on it).
- Incoming ids are validated (format/length) before being trusted — not in the issue, added to stop log/header injection.
- `pino-pretty` is a **dev dependency**: production images run `NODE_ENV=production` and never load it.
- Remaining `console.*` calls (in `src/config/env.js`, which runs before the logger can exist) stay with their reasoned disables.
