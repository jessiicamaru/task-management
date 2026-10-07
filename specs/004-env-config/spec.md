# Feature Specification: Validated environment configuration

**Feature Branch**: `004-env-config`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Implement GitHub issue #4 (https://github.com/jessiicamaru/task-management/issues/4): feat(config): validated environment configuration loader and .env.example — src/config/env.js loads dotenv only outside production, parses the whole environment through one zod schema (NODE_ENV, PORT, DATABASE_URL, DATABASE_SSL, DB_POOL_MAX, JWT_SECRET, JWT_ACCESS_TTL, JWT_REFRESH_TTL, LOG_LEVEL, CORS_ORIGINS, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX), exports a frozen object; on failure prints every failing key with the reason (never the value) and exits 1; refuses production with the dev JWT secret or one shorter than 32 chars; .env.example; src/config/index.js exposes config.db / config.jwt / config.http so nothing else reads process.env."

## User Scenarios & Testing *(mandatory)*

Users are operators deploying the API (Render, Docker) and contributors running it locally.

### User Story 1 - Misconfiguration fails loudly at boot (Priority: P1)

An operator deploys with a variable missing or malformed. The service refuses to start and the
deploy log names every bad variable and why — without printing any secret value.

**Why this priority**: The most common failure for this deployment shape is a variable present
locally but never set on the platform, surfacing as a 500 an hour after deploy.

**Independent Test**: Start the service with `JWT_SECRET` unset → exit ≠ 0 and output contains
`JWT_SECRET: required`; with several bad variables → all are listed in one report.

**Acceptance Scenarios**:

1. **Given** `JWT_SECRET` unset, **When** the service starts, **Then** it exits non-zero printing `JWT_SECRET: required`.
2. **Given** production and `JWT_SECRET=short`, **When** the service starts, **Then** it exits non-zero with a length reason.
3. **Given** production and the development placeholder secret from `.env.example`, **When** it starts, **Then** it refuses.
4. **Given** several invalid variables, **When** it starts, **Then** every one is reported in a single message.
5. **Given** any failure, **When** the error is printed, **Then** no variable's value appears in it.

---

### User Story 2 - One structured config for the code (Priority: P2)

Modules read `config.db`, `config.jwt`, `config.http` (typed, defaulted, frozen) and never the raw
environment.

**Independent Test**: No `process.env` outside `src/config/`; the server's port comes from config.

**Acceptance Scenarios**:

1. **Given** valid variables, **When** config is loaded, **Then** values are typed (numbers, booleans, lists) with defaults applied.
2. **Given** loaded config, **When** code tries to mutate it, **Then** the mutation has no effect.
3. **Given** the codebase, **When** searching for `process.env` outside `src/config/`, **Then** nothing is found.

---

### User Story 3 - Documented local setup (Priority: P3)

A contributor copies `.env.example` to `.env` and the service starts locally with no further edits
(other than a reachable database once one is used).

**Independent Test**: Every variable in the table exists in `.env.example` with a comment.

### Edge Cases

- A stray `.env` baked into a production image must never override platform variables.
- `PORT` absent (e.g. `docker run` without `-e PORT`) → default 3000.
- `DATABASE_SSL=false` must mean false (string-to-boolean pitfalls).
- `CORS_ORIGINS=*` in production → refused.
- TTLs given as bare numbers (`15`) → refused; duration strings only, so `'15'` vs `15` ambiguity never reaches the JWT library.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The environment MUST be validated as a whole at startup against the twelve variables in issue #4 with the stated types and defaults.
- **FR-002**: `.env` loading MUST happen only when `NODE_ENV` is not `production`.
- **FR-003**: Validation failures MUST be aggregated into one report of `KEY: reason` lines, contain no values, and end the process with a non-zero code.
- **FR-004**: `DATABASE_URL` and `JWT_SECRET` MUST be required in every environment (no defaults).
- **FR-005**: In production, `JWT_SECRET` MUST be ≥ 32 characters and differ from the `.env.example` placeholder; `CORS_ORIGINS` MUST be set and MUST NOT contain `*`.
- **FR-006**: TTLs MUST be duration strings (`<n>s|m|h|d`).
- **FR-007**: The exported config MUST be deeply frozen and grouped as `env`, `http`, `db`, `jwt`, `log`, `rateLimit`.
- **FR-008**: `.env.example` MUST list every variable with a safe placeholder and a one-line comment.
- **FR-009**: The server entrypoint MUST take its port from config; no `process.env` outside `src/config/`.

### Key Entities

- **Configuration**: the validated, typed, frozen view of the environment, grouped by concern.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of invalid-variable cases are reported in a single startup failure (none discovered later at first use).
- **SC-002**: 0 secret values appear in any startup error output.
- **SC-003**: 12/12 variables documented in `.env.example`.
- **SC-004**: 0 occurrences of `process.env` outside `src/config/`.

## Assumptions

- **"Development default" for `JWT_SECRET`** is read as the placeholder in `.env.example`, not a
  schema default: the acceptance criterion "unset → `JWT_SECRET: required`" rules out a default.
- `DATABASE_URL` is required in development and test too — failing at boot beats failing at first query.
- `PORT` keeps the default 3000 everywhere (Render overrides it).
- `CORS_ORIGINS=*` is forbidden in production now (issue recommendation), not deferred to #6.
- TTLs are **duration strings** only.
- `docker-compose.yml` (#36) and `render.yaml` (#46) do not exist yet; they pick up the variables from `.env.example` when they land.
