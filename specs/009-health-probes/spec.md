# Feature Specification: Liveness and readiness probes

**Feature Branch**: `009-health-probes`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Implement GitHub issue #8 (https://github.com/jessiicamaru/task-management/issues/8): feat(health): /healthz liveness and /readyz readiness probes — health module mounted at the root before auth and rate limiting; /healthz 200 { status, uptime, version } with no database call; /readyz SELECT 1 with a 2 s timeout → 200 { status: 'ready', checks: { database: 'ok', latencyMs } } or 503 { status: 'not_ready', checks: { database: 'unreachable' } }; version from package.json plus GIT_SHA; both quiet in the access log and outside rate limiting."

## User Scenarios & Testing *(mandatory)*

Users: the platform health check (Render), docker compose (#39), the deploy smoke test (#45), operators.

### User Story 1 - Liveness that never depends on the database (Priority: P1)

The platform asks "is the process alive?" and gets 200 fast, even when the database is down — so a
healthy process is never killed for a fault it cannot fix.

**Acceptance Scenarios**:

1. **Given** the database is unreachable, **When** `/healthz` is requested, **Then** 200 `{ status: 'ok', uptime, version }` within 50 ms.
2. **Given** no credentials, **When** either probe is requested, **Then** it is answered (no auth).

---

### User Story 2 - Readiness that reflects the database (Priority: P1)

**Acceptance Scenarios**:

1. **Given** the database answers `SELECT 1`, **Then** `/readyz` → 200 `{ status: 'ready', checks: { database: 'ok', latencyMs } }`.
2. **Given** the database is unreachable or slower than 2 s, **Then** `/readyz` → 503 `{ status: 'not_ready', checks: { database: 'unreachable' } }` — never 500, never 200.

---

### User Story 3 - Which build is running (Priority: P2)

**Acceptance Scenarios**:

1. **Given** the service, **Then** `version` equals `package.json`'s version.
2. **Given** `GIT_SHA` was set at build time, **Then** `version` includes its short form (`0.1.0+abc1234`).

### Edge Cases

- The check hangs (network black hole): the 2 s timeout answers 503; the request never hangs.
- Probes at `info` would drown real traffic: logged only at `debug` (#5 already does this).
- `GET /` (the #1 scaffold signal) is superseded by `/healthz` and removed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Health routes MUST be mounted at the root before `/api/v1` (and before any future auth or rate limiter).
- **FR-002**: `/healthz` MUST NOT touch the database.
- **FR-003**: `/readyz` MUST run a database round trip bounded at 2 s and map failure to 503.
- **FR-004**: `version` = `package.json` version, plus `+<short sha>` when `GIT_SHA` is set.
- **FR-005**: `GIT_SHA` is a new optional variable: validated, in `.env.example`, documented.
- **FR-006**: The database check MUST be injectable so it can be swapped for the pool (#10) and tested.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `/healthz` p100 < 50 ms with the database down.
- **SC-002**: `/readyz` answers within 2.5 s in every failure mode.
- **SC-003**: 0 database calls from `/healthz`.

## Assumptions

- **#10 (pool) has not landed.** The default readiness check opens one short-lived `pg.Client`
  per probe (connect, `SELECT 1`, end), with SSL from `config.db.ssl`. #10 replaces it with
  `pool.query('SELECT 1')` through the same injection point.
- **Render's health check → `/healthz`**; `/readyz` for compose and the smoke test (issue recommendation). #46 must match.
- **No caching** of `/readyz`: free-tier probe intervals are long; a cached "ready" would hide an outage.
- **No migration status** in `/readyz`: it would fail the probe mid-rollout, exactly when the old instance must keep serving.
- **Rate limiting (#24) does not exist yet**: mounting before `/api/v1` is what keeps probes outside it; the "hammer past the threshold" check becomes testable with #24.
- **Not verified against a real PostgreSQL** in this change (no database available locally); the unreachable path is verified against a closed port.
