# Feature Specification: Move the API to TypeScript

**Feature Branch**: `007-typescript-migration`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Implement GitHub issue #75 (https://github.com/jessiicamaru/task-management/issues/75): refactor(repo): move the API to TypeScript and align strictness with web — server/tsconfig strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes, NodeNext, compile to dist; rename src and tests to .ts and type config, createApp options, error body, req.id/req.log, getRequestId; scripts build/start/dev (tsx)/typecheck; typescript-eslint type-checked with no-floating-promises and no-misused-promises; lint-staged covers .ts; README and an ADR. Prioritised before the remaining M1 issues."

## User Scenarios & Testing *(mandatory)*

Users are contributors writing the remaining backlog and the operators running the build.

### User Story 1 - The API compiles and runs as TypeScript (Priority: P1)

A contributor writes TypeScript under `server/src/`; the type checker passes under the strictest
flags, the build produces runnable JavaScript, and the running service behaves exactly as before.

**Independent Test**: `npm run typecheck` → 0; `npm run build && npm start` → `/` returns 200 with
helmet headers and `x-request-id`; every existing test passes as `.ts`.

**Acceptance Scenarios**:

1. **Given** the converted tree, **When** the type check runs with `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, **Then** it exits 0.
2. **Given** a build, **When** the compiled server starts, **Then** it serves `/` with 200, helmet headers and `x-request-id`.
3. **Given** no JavaScript remains under `server/src` and `server/tests`, **When** tests run, **Then** every test from #1–#6 passes.
4. **Given** the dev command, **When** a `.ts` file changes, **Then** the server restarts.

---

### User Story 2 - Unhandled promises are a lint error (Priority: P1)

A contributor who calls an async function without awaiting or handling it gets a lint error, not
a request that hangs in production.

**Acceptance Scenarios**:

1. **Given** `someAsync();` in a module, **When** lint runs, **Then** it fails with `@typescript-eslint/no-floating-promises`.
2. **Given** the converted tree, **When** lint runs, **Then** it exits 0 with every #2 rule still active.

---

### User Story 3 - Decision recorded, docs current (Priority: P2)

The README, script table and an ADR say how the server is built and run, and why.

### Edge Cases

- The project's Node floor (22.12) cannot run `.ts` natively — production must not depend on runtime type stripping.
- Tests that spawn the server must spawn a runnable entry (no `.js` source to spawn any more).
- Commit hooks must lint `.ts` files.
- `npm ci` must stay free of peer-dependency warnings.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: No `.js` files under `server/src` or `server/tests`.
- **FR-002**: Type check with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` MUST pass.
- **FR-003**: Production MUST run compiled output from `dist/`; development MUST run sources with watch-restart.
- **FR-004**: Scripts `build`, `typecheck` added; `start`, `dev`, `seed` updated; all other script names unchanged.
- **FR-005**: Lint MUST use type-aware rules including `no-floating-promises` and `no-misused-promises` as errors, keeping every #2 rule.
- **FR-006**: Config, app options, the error body, request augmentation and request context MUST be typed (config inferred from the env schema).
- **FR-007**: Pre-commit linting MUST cover `.ts`.
- **FR-008**: README and an ADR MUST document the decision.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 JavaScript source files remain in `server/src` and `server/tests`.
- **SC-002**: 0 type errors under the strict flag set.
- **SC-003**: 100% of the existing tests pass unchanged in intent.
- **SC-004**: Observable HTTP behaviour identical to #6 (same status codes, headers, bodies).

## Assumptions

- **Compile with `tsc` to `dist/`** rather than strip types at runtime: the Node floor is 22.12 and stripping lacks enums/parameter properties.
- **TypeScript 6.0**, not 7: `typescript-eslint` 8 peers `typescript <6.1`.
- Tooling config files (`eslint.config.js`, `vitest.config.js`, `commitlint.config.js`) stay JavaScript — they are tool inputs, not application code, and keep working without a loader.
- No shared types package between `web/` and `server/` (README: apps are self-contained); OpenAPI (#32) is the contract.
- `web/` is not built here; #51 already specifies the same strictness flags.
