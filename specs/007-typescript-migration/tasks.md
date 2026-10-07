---

description: "Task list for moving the API to TypeScript (issue #75)"
---

# Tasks: Move the API to TypeScript

**Input**: Design documents from `specs/007-typescript-migration/`

**Tests**: Existing suite converted; a floating-promise lint check added.

## Phase 1: Setup

- [X] T001 Install dev deps in `server/` (see plan) with `typescript@~6.0.3`; confirm no peer warnings
- [X] T002 Create `server/tsconfig.json` and `server/tsconfig.build.json`; add `dist/` handling (root `.gitignore` already ignores `dist/`; add to `.prettierignore`)

## Phase 2: User Story 1 - Compile and run (Priority: P1) 🎯 MVP

- [X] T003 [US1] `git mv` every `server/src/**/*.js` and `server/tests/**/*.js` to `.ts`
- [X] T004 [US1] Type `server/src/config/env.ts` (`Env` = `z.infer`, `Config` type, typed `parseEnv` result) and `server/src/config/index.ts`
- [X] T005 [US1] Type `server/src/config/logger.ts`, `server/src/utils/*.ts`, `server/src/middlewares/*.ts` (error body type), `server/src/app.ts` (`CreateAppOptions`), `server/src/routes/index.ts`, `server/src/server.ts`, `server/src/db/seed.ts`
- [X] T006 [US1] Type the tests; boot test spawns `src/server.ts` via `node --import tsx`
- [X] T007 [US1] Scripts: `build`, `typecheck`, `start` → `node dist/server.js`, `dev` → `tsx watch src/server.ts`, `seed` → `tsx src/db/seed.ts`
- [X] T008 [US1] Verify: typecheck 0, tests pass, `build && start` serves `/` with headers, dev restarts on change

## Phase 3: User Story 2 - Type-aware lint (Priority: P1)

- [X] T009 [US2] Rewrite `server/eslint.config.js` with typescript-eslint type-checked + every #2 rule; lint-staged `*.{js,ts}`
- [X] T010 [US2] Verify lint 0; an un-awaited call fails `no-floating-promises`; format check passes

## Phase 4: User Story 3 - Docs (Priority: P2)

- [X] T011 [P] [US3] `docs/adr/0001-typescript-server.md` (copy structure from `docs/adr/0000-template.md`)
- [X] T012 [P] [US3] `server/README.md`: layout `.ts`, scripts table, getting started (`npm run build`)

## Phase 5: Polish

- [X] T013 `git ls-files server/src server/tests | grep '\.js$'` empty; `npm ci` clean; full lint/format/typecheck/test

## Dependencies

Setup → US1 → US2 → US3 → Polish.
