---

description: "Task list for liveness and readiness probes (issue #8)"
---

# Tasks: Liveness and readiness probes

**Input**: Design documents from `specs/009-health-probes/`

**Tests**: Required by the acceptance criteria.

## Phase 1: Foundational

- [ ] T001 Add optional `GIT_SHA` (hex, 7–40 chars) to `server/src/config/env.ts`, `Config.build`, `server/.env.example`, and the env unit tests
- [ ] T002 Create `server/src/config/version.ts` reading `package.json` version and appending `+<sha7>`

## Phase 2: User Story 1 - Liveness (Priority: P1) 🎯 MVP

- [ ] T003 [US1] `server/src/modules/health/health.service.ts` `liveness()`; `health.controller.ts`; `health.routes.ts` `createHealthRouter()`
- [ ] T004 [US1] Mount at root in `server/src/app.ts` before `/api/v1`; remove the scaffold `GET /`; move tests from `/` to `/healthz`
- [ ] T005 [US1] Tests: 200 shape, < 50 ms with an unreachable DB, check never called

## Phase 3: User Story 2 - Readiness (Priority: P1)

- [ ] T006 [US2] `health.repository.ts` `pingDatabase()` (one-shot pg.Client, connect/query timeouts, `end()` in `finally`); `readiness()` with 2 s race and latency
- [ ] T007 [US2] `createApp({ checkDatabase })` injection; tests: ok → 200 with latencyMs, rejecting → 503, hanging → 503 within 2.5 s, real closed port → 503

## Phase 4: User Story 3 - Version (Priority: P2)

- [ ] T008 [US3] Tests: version equals package.json; `GIT_SHA` adds `+abc1234`

## Phase 5: Polish

- [ ] T009 README health section (which probe Render uses; no cache; no migration status)
- [ ] T010 typecheck, lint, format, tests
