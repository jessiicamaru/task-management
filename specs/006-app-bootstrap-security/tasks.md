---

description: "Task list for Express bootstrap with security middleware (issue #6)"
---

# Tasks: Express application bootstrap with security middleware

**Input**: Design documents from `specs/006-app-bootstrap-security/`

**Tests**: Required by the acceptance criteria.

## Phase 1: Foundational

- [ ] T001 Update `server/src/config/env.js`: `CORS_ORIGINS` default `['http://localhost:5173']` outside production; `*` refused in every environment; update `server/tests/unit/config.env.test.js` and the comment in `server/.env.example`
- [ ] T002 Create `server/src/middlewares/error-handler.js` with `notFound` and `errorHandler` (shape `{ error: { code, message, details, requestId } }`)
- [ ] T003 Create `server/src/routes/index.js` exporting `createApiRouter()`

## Phase 2: User Story 1 - Safe defaults (Priority: P1) 🎯 MVP

- [ ] T004 [US1] Rewrite `server/src/app.js` as the ordered chain (trust proxy → request logger → context → helmet → cors → compression → json/urlencoded → health mount point → `/api/v1` → notFound → errorHandler), each with its reason; `createApp({ logger, config })`
- [ ] T005 [US1] Tests in `server/tests/integration/app.test.js`: helmet headers + `x-request-id` + no `x-powered-by`; 200 KB → 413 shape; malformed JSON → 400 shape; unknown route → 404 shape; thrown error → 500 generic

## Phase 3: User Story 2 - CORS (Priority: P1)

- [ ] T006 [US2] Tests: allowed origin gets `access-control-allow-origin` + `-credentials`; disallowed gets none (simple + preflight); `createApp` with `*` throws
- [ ] T007 [US2] Boot test: `CORS_ORIGINS=*` → exit 1 with the reason

## Phase 4: User Story 3 - Mounting (Priority: P2)

- [ ] T008 [US3] Tests: two `createApp()` calls are independent; `/api/v1` router mounted
- [ ] T009 [US3] `server/src/server.js` logs the bound address

## Phase 5: Polish

- [ ] T010 README: middleware order summary and CORS note
- [ ] T011 Lint, format check, tests

## Dependencies

Foundational → US1 → US2 → US3 → Polish.
