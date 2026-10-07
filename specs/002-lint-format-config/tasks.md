---

description: "Task list for lint and format configuration (issue #2)"
---

# Tasks: Lint and format configuration

**Input**: Design documents from `specs/002-lint-format-config/`

**Tests**: Verification by running lint/format with and without deliberate violations.

## Phase 1: Setup

- [ ] T001 Install dev deps in `server/`: `eslint@^9 @eslint/js@^9 globals eslint-plugin-import eslint-plugin-n eslint-plugin-promise eslint-config-prettier prettier`; confirm no peer warnings
- [ ] T002 Add `lint:fix` (`eslint . --fix`) and `format:check` (`prettier --check .`) to `server/package.json`

## Phase 2: Foundational

- [ ] T003 [P] Create `server/.prettierrc` (printWidth 100, singleQuote, trailingComma all, semi true, endOfLine lf)
- [ ] T004 [P] Create `server/.prettierignore` (node_modules, coverage, package-lock.json)

## Phase 3: User Story 1 - Lint gate (Priority: P1) 🎯 MVP

- [ ] T005 [US1] Create `server/eslint.config.js`: ignores (node_modules, coverage); @eslint/js recommended; n flat/recommended-module; promise flat/recommended; import plugin with `import/order` per research R6; `no-console`, `no-process-env`, `no-return-await`, `promise/catch-or-return` as error, `require-await` off; override `src/config/**` → `no-process-env` off; override `tests/**`, `eslint.config.js` → `n/no-unpublished-import` off; override `src/server.js` → `n/no-process-exit` off; eslint-config-prettier last
- [ ] T006 [US1] Add reasoned single-line disables in `server/src/server.js` (no-process-env → #4, no-console → #5) and `server/src/db/seed.js` (no-console)
- [ ] T007 [US1] Verify `npm run lint` exits 0; `console.log` in `server/src/modules/tasks/tasks.service.js` → exit 1; `process.env.X` there → exit 1; same in a temp `server/src/config/` file → passes; revert

## Phase 4: User Story 2 - Formatting (Priority: P2)

- [ ] T008 [US2] Run `npm run format` in `server/`, then `npm run format:check` exits 0 and `npm run lint` still exits 0

## Phase 5: User Story 3 - EditorConfig (Priority: P3)

- [ ] T009 [P] [US3] Create root `.editorconfig`: `root = true`; `[*]` utf-8, lf, space, 2, final newline, trim trailing whitespace; `[*.md]` keep trailing whitespace; `[*.{bat,cmd,ps1}]` crlf (matches `.gitattributes`)

## Phase 6: Polish

- [ ] T010 Update `server/README.md` scripts table: lint/format runnable, add `lint:fix`, `format:check`
- [ ] T011 Run `npm test` in `server/` to confirm nothing regressed

## Dependencies

Setup → Foundational → US1 → US2; US3 independent. MVP = US1.
