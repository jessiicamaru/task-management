---

description: "Task list for structured logging (issue #5)"
---

# Tasks: Structured logging with request correlation

**Input**: Design documents from `specs/005-structured-logging/`

**Tests**: Required by the acceptance criteria (log capture and grep).

## Phase 1: Setup

- [X] T001 Install `pino-pretty` as a dev dependency in `server/`
- [X] T002 Create `server/vitest.config.js` with a complete test environment (`LOG_LEVEL=silent`); add it to the dev-import override in `server/eslint.config.js`

## Phase 2: Foundational

- [X] T003 Create `server/src/utils/request-context.js` (AsyncLocalStorage middleware + `getRequestId`)
- [X] T004 Create `server/src/config/logger.js`: `REDACT_PATHS`, `createLogger({ level, pretty, destination })` with base service, err serializers, reqId mixin; export `logger`

## Phase 3: User Story 1 - Correlation (Priority: P1) 🎯 MVP

- [X] T005 [US1] Create `server/src/middlewares/request-logger.js` (pino-http, `quietReqLogger`, validated `x-request-id` or UUID, header echo, levels, quiet probes)
- [X] T006 [US1] Update `server/src/app.js`: `createApp({ logger })`, mount request logger then request context
- [X] T007 [US1] Tests in `server/tests/integration/logging.test.js`: incoming id echoed and logged; generated UUID; malformed id replaced; service-level line tagged; no duplicate `reqId`

## Phase 4: User Story 2 - No leaks (Priority: P1)

- [X] T008 [P] [US2] Create `server/src/utils/database-url.js` + `server/tests/unit/database-url.test.js`
- [X] T009 [US2] Tests: login body/headers not in output; nested credentials redacted

## Phase 5: User Story 3 - Signal over noise (Priority: P2)

- [X] T010 [US3] Update `server/src/server.js`: single startup line (port, env, level, described DB), fatal on listen error; `server/src/db/seed.js` uses the logger
- [X] T011 [US3] Tests: 2xx info / 4xx warn; `/healthz` only at debug; Error has message and stack

## Phase 6: Polish

- [X] T012 Add a "Logging" section to `server/README.md`
- [X] T013 Run lint, format check, tests; boot in development (pretty) and production (JSON, no credentials)

## Dependencies

Setup → Foundational → US1 → US2/US3 → Polish. MVP = US1 + US2 (both P1).
