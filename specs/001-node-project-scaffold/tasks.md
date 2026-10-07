---

description: "Task list for the API project scaffold (issue #1)"
---

# Tasks: API project scaffold

**Input**: Design documents from `specs/001-node-project-scaffold/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: FR-010 requires one integration test for `GET /`; no other tests.

**Organization**: Tasks are grouped by user story. All paths are relative to the repository root.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Package manifest and runtime pin

- [X] T001 Create `server/package.json` with `"name": "task-management-api"`, `"private": true`, `"type": "module"`, `"engines": { "node": ">=22.12.0" }` (research R2), and an empty `scripts` object
- [X] T002 [P] Create `server/.nvmrc` containing `22`
- [X] T003 Install runtime dependencies in `server/`: `npm install express@^5 pg@^8 zod pino pino-http helmet cors compression jsonwebtoken express-rate-limit` (writes `server/package-lock.json`)
- [X] T004 Install dev dependencies in `server/`: `npm install -D vitest supertest node-pg-migrate`; confirm the install log shows no peer-dependency warnings (research R3)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The app/server split every story depends on

- [X] T005 Create `server/src/app.js` exporting `createApp()` that builds an Express 5 app with `GET /` → `200` JSON `{ "status": "ok" }` (contracts/http-root.md); no other middleware yet
- [X] T006 Create `server/src/server.js` that imports `createApp`, reads `PORT` (default `3000`), calls `listen`, logs the bound port, and on a server `error` event (e.g. `EADDRINUSE`) logs it and exits with code 1

**Checkpoint**: `node server/src/server.js` serves `/`

---

## Phase 3: User Story 1 - Boot a runnable API from a clean clone (Priority: P1) 🎯 MVP

**Goal**: Clean clone → `npm ci` → `npm start` → `GET /` is 200; tree stays clean

**Independent Test**: quickstart.md steps 1, 3–5

- [X] T007 [US1] Add `start` (`node src/server.js`) and `dev` (`node --watch src/server.js`) scripts to `server/package.json`
- [X] T008 [US1] Create `server/tests/integration/app.test.js` with Vitest + Supertest: `GET /` returns 200 with `{ status: "ok" }`; `GET /does-not-exist` returns 404
- [X] T009 [US1] Verify in `server/`: `rm -rf node_modules && npm ci` (no peer warnings), `npm start` then request `/` → 200, `PORT=4000` override works, second instance on the same port exits non-zero, `git status --porcelain` empty afterwards

**Checkpoint**: MVP — the scaffold demonstrably runs

---

## Phase 4: User Story 2 - Agreed command names for every workflow (Priority: P2)

**Goal**: All ten script names exist exactly per contracts/npm-scripts.md

**Independent Test**: Inspect `scripts`; `npm test` and `npm run seed` exit 0

- [X] T010 [US2] Add the remaining scripts to `server/package.json`: `lint` (`eslint .`), `format` (`prettier --write .`), `test` (`vitest run`), `test:watch` (`vitest`), `migrate:up` (`node-pg-migrate up`), `migrate:down` (`node-pg-migrate down`), `migrate:create` (`node-pg-migrate create`), `seed` (`node src/db/seed.js`)
- [X] T011 [P] [US2] Create `server/src/db/seed.js` placeholder that logs "no seed data yet" and exits 0
- [X] T012 [US2] Run `npm test` and `npm run seed` in `server/`; both exit 0

---

## Phase 5: User Story 3 - A fixed project layout (Priority: P3)

**Goal**: Every directory later issues name already exists

**Independent Test**: List `server/` and compare with the tree in plan.md

- [X] T013 [P] [US3] Create `.gitkeep` in `server/src/config/`, `server/src/middlewares/`, `server/src/utils/`, `server/migrations/`, `server/tests/unit/`
- [X] T014 [P] [US3] For each module in `auth users projects tasks health`, create `server/src/modules/<m>/<m>.routes.js`, `<m>.controller.js`, `<m>.service.js`, `<m>.repository.js`, `<m>.schema.js`, each a one-line comment naming its layer's responsibility (HTTP routing / request→response / business logic / SQL / zod schemas) and `export {};`
- [X] T015 [US3] Run `npm test` in `server/` to confirm the placeholder modules do not break the suite (Vitest must not pick them up as tests)

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T016 [P] Update `server/README.md`: replace the "Not built yet" note with a short "Getting started" (Node 22.12+, `npm ci`, `npm start`, `npm test`), align the scripts table with contracts/npm-scripts.md, and note that `lint`/`format` become runnable with #2
- [X] T017 Run quickstart.md end to end and confirm `git status --porcelain` is empty apart from intended changes

---

## Dependencies & Execution Order

- Setup (T001–T004) → Foundational (T005–T006) → US1 → US2 → US3 → Polish
- US2 and US3 depend only on Foundational; they touch different files and could run in parallel
  after T006, except that T007 and T010 both edit `server/package.json` (do them in sequence)
- T009 / T012 / T015 / T017 are verification steps and must follow the tasks in their phase

## Parallel Example

```text
After T006:
  T011 [US2] server/src/db/seed.js
  T013 [US3] .gitkeep files
  T014 [US3] module placeholders
  T016 README update
```

## Implementation Strategy

- **MVP**: Phases 1–3 (US1) — a runnable, tested app.
- Then US2 (script contract) and US3 (layout) are additive and low-risk.
- Commit after each phase with Conventional Commits scope `repo` / `api`.
