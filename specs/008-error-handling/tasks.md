---

description: "Task list for centralised error handling (issue #7)"
---

# Tasks: Centralised error handling and one error shape

**Input**: Design documents from `specs/008-error-handling/`

**Tests**: Required by the acceptance criteria.

## Phase 1: Foundational

- [ ] T001 Create `server/src/utils/errors.ts`: `AppError(message, code, statusCode, details?)`, `isOperational`, and BadRequest/Unauthorized/Forbidden/NotFound/Conflict/Unprocessable/TooManyRequests with default codes
- [ ] T002 Add `apiRouter` option to `createApp` in `server/src/app.ts` (defaults to `createApiRouter()`)

## Phase 2: User Story 1 - One shape (Priority: P1) 🎯 MVP

- [ ] T003 [US1] Extend `server/src/middlewares/error-handler.ts`: `toHttpError(err)` mapping AppError, ZodError (422 `validation_failed`, details `{ path, message }`), pg 23505/23503 → 409, 22P02 → 400, body-parser 4xx, fallback 500; headers-sent delegation
- [ ] T004 [P] [US1] `server/tests/unit/errors.test.ts`: subclasses' status/code/isOperational/instanceof
- [ ] T005 [US1] `server/tests/integration/errors.test.ts`: NotFoundError → 404 shape; ZodError → 422 details; pg codes; unmatched → JSON 404 with requestId

## Phase 3: User Story 2 - No leaks, no hangs (Priority: P1)

- [ ] T006 [US2] Tests: async handler rejecting → 500 (pins Express 5 forwarding); thrown non-Error → 500; 500 body in production config has no stack/SQL/path
- [ ] T007 [US2] `server/src/server.ts`: `unhandledRejection` / `uncaughtException` → `logger.fatal` + exit 1; boot-style test spawning a script that triggers each

## Phase 4: User Story 3 - Logging (Priority: P2)

- [ ] T008 [US3] Error handler logs 5xx at error with `err`, 4xx at warn with code/status only; tests capture levels and assert no stack on 4xx

## Phase 5: Polish

- [ ] T009 README: error section (shape, codes, AppError usage, no asyncHandler and why)
- [ ] T010 typecheck, lint, format, tests

## Dependencies

Foundational → US1 → US2 → US3 → Polish.
