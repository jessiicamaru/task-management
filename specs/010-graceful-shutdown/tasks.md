---

description: "Task list for graceful shutdown (issue #9)"
---

# Tasks: Graceful shutdown on SIGTERM

**Input**: Design documents from `specs/010-graceful-shutdown/`

**Tests**: Required by the acceptance criteria.

## Phase 1: Foundational

- [ ] T001 Add `SHUTDOWN_TIMEOUT_MS` (int, default 10000) to `server/src/config/env.ts` (`config.shutdown.timeoutMs`), `server/.env.example`, env tests
- [ ] T002 Create `server/src/lifecycle.ts` (draining flag, in-flight counter middleware decrementing once on finish/close, `idle()` promise)
- [ ] T003 `createApp({ lifecycle })` mounts the counter first; readiness returns 503 `{ status: 'not_ready', checks: { shutdown: 'draining' } }` while draining

## Phase 2: User Story 1 - Drain (Priority: P1) 🎯 MVP

- [ ] T004 [US1] Create `server/src/shutdown.ts`: idempotent sequence (drain → close → idle → closers → flush → exit 0), hard timer → log outstanding + exit 1
- [ ] T005 [US1] Create `server/src/start.ts` (listen, keepAliveTimeout 65 s, headersTimeout 66 s, SIGTERM/SIGINT, startup log) and reduce `server/src/server.ts` to `start()`
- [ ] T006 [US1] Tests: slow request completes then exit 0; `/readyz` 503 during drain; idle keep-alive shutdown < 1 s; SIGTERM via `process.emit`

## Phase 3: User Story 2 - Never hangs (Priority: P1)

- [ ] T007 [US2] Tests: request past the timeout → exit 1 with outstanding count logged; second SIGTERM ignored
- [ ] T008 [US2] Spawn test with a real SIGTERM (skipped on Windows)

## Phase 4: Polish

- [ ] T009 README shutdown section
- [ ] T010 typecheck, lint, format, tests
