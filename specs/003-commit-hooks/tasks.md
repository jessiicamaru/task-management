---

description: "Task list for commit hooks (issue #3)"
---

# Tasks: Commit hooks and commit-message convention

**Input**: Design documents from `specs/003-commit-hooks/`

**Tests**: Verification by real commits on a throwaway branch.

## Phase 1: Setup

- [ ] T001 Install dev deps in `server/`: `husky@^9 lint-staged@^16 @commitlint/cli @commitlint/config-conventional`; confirm no peer/engine warnings
- [ ] T002 Add `"prepare": "cd .. && husky server/.husky"` to `server/package.json` scripts

## Phase 2: User Story 1 - Commit messages (Priority: P1) 🎯 MVP

- [ ] T003 [US1] Create `server/commitlint.config.js` extending `@commitlint/config-conventional` with `scope-enum` error over the 22 scopes in contracts/hooks.md
- [ ] T004 [US1] Create `server/.husky/commit-msg`: resolve `$1` to an absolute path, `cd server`, `npx --no -- commitlint --edit "$abs"`
- [ ] T005 [US1] Verify: `bad message` rejected, `feat(tasks): add status filter` accepted, `feat(nope): x` rejected

## Phase 3: User Story 2 - Pre-commit lint (Priority: P2)

- [ ] T006 [US2] Add `lint-staged` config to `server/package.json`: `*.js` → `eslint --fix`, `prettier --write`; `*.{json,md,yml,yaml}` → `prettier --write --ignore-unknown`
- [ ] T007 [US2] Create `server/.husky/pre-commit`: `cd server && npx --no -- lint-staged`
- [ ] T008 [US2] Verify: misordered imports fixed and committed; `console.log` in a module blocks; a change only outside `server/` commits without running tools

## Phase 4: User Story 3 - Self-installing (Priority: P3)

- [ ] T009 [US3] Verify: unset `core.hooksPath`, `npm ci` in `server/` sets it to `server/.husky/_`

## Phase 5: Polish

- [ ] T010 [P] Create `docs/commits.md`: format, types, scope list with when to use each, three real examples from this repo, `--no-verify` policy; link from `docs/README.md` table (already lists it)
- [ ] T011 [P] Add a "Commits" note to `server/README.md` pointing at `docs/commits.md`
- [ ] T012 Run `npm run lint`, `npm run format:check`, `npm test` in `server/`

## Dependencies

Setup → US1 → US2 → US3 → Polish. MVP = US1.
