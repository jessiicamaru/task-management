---

description: "Task list for validated environment configuration (issue #4)"
---

# Tasks: Validated environment configuration

**Input**: Design documents from `specs/004-env-config/`

**Tests**: Requested by the acceptance criteria (exit codes, messages, no values printed).

## Phase 1: Setup

- [ ] T001 Install `dotenv` as a runtime dependency in `server/`

## Phase 2: Foundational

- [ ] T002 Create `server/src/config/env.js`: `DEV_JWT_SECRET_PLACEHOLDER`, zod schema per data-model.md with value-free messages, production `superRefine`, `parseEnv(source)` returning `{ ok, env }` / `{ ok: false, errors }`, and `loadEnv()` (dotenv quiet outside production, print errors, exit 1)
- [ ] T003 Create `server/src/config/index.js` exporting deep-frozen `config` grouped as `env`, `http`, `db`, `jwt`, `log`, `rateLimit` plus `isProduction`, `isTest`; remove `server/src/config/.gitkeep`

## Phase 3: User Story 1 - Fail loudly at boot (Priority: P1) 🎯 MVP

- [ ] T004 [P] [US1] Create `server/tests/unit/config.env.test.js`: valid minimal env + defaults; `JWT_SECRET` missing → `JWT_SECRET: required`; multiple failures aggregated; prod short secret; prod placeholder secret; prod `CORS_ORIGINS` missing / `*`; bad `PORT`; `DATABASE_SSL=false` → false; bare-number TTL rejected; non-postgres URL rejected; no error string contains a supplied value
- [ ] T005 [P] [US1] Create `server/tests/integration/config.boot.test.js`: spawn `node src/server.js` from a temp cwd with `JWT_SECRET` unset → exit 1, stderr has `JWT_SECRET: required`; production with a short secret → exit 1, secret value absent from output
- [ ] T006 [US1] Update `server/src/server.js` to import `config` and listen on `config.http.port`; drop the `no-process-env` disable

## Phase 4: User Story 2 - Structured config (Priority: P2)

- [ ] T007 [US2] Verify `grep -rn "process.env" server/src --include=*.js | grep -v src/config/` is empty and a mutation of `config` throws in strict mode (unit test in T004)

## Phase 5: User Story 3 - Documented setup (Priority: P3)

- [ ] T008 [US3] Create `server/.env.example` with all twelve variables, placeholders, one-line comments; `JWT_SECRET` = `DEV_JWT_SECRET_PLACEHOLDER`
- [ ] T009 [US3] Add a unit test asserting every schema key appears in `.env.example` and the placeholder matches

## Phase 6: Polish

- [ ] T010 Update `server/README.md` "Getting started" (copy `.env.example`) and add a "Configuration" section
- [ ] T011 Run `npm run lint`, `npm run format:check`, `npm test`; manual boot with `.env`

## Dependencies

Setup → Foundational → US1 → US2/US3 → Polish. MVP = US1.
