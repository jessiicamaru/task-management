# Feature Specification: Web app scaffold

**Feature Branch**: `012-web-scaffold`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Implement GitHub issue #51 (https://github.com/jessiicamaru/task-management/issues/51): chore(web): scaffold the Vite + React + TypeScript app with tooling — own package.json; Vite + React 19 + TS with react-router, TanStack Query, react-hook-form, zod, @hookform/resolvers, tailwindcss; strict tsconfig + noUncheckedIndexedAccess + exactOptionalPropertyTypes, @/* alias in tsconfig and vite; scripts dev/build (tsc -b && vite build)/preview/lint/typecheck/test/test:e2e; ESLint 9 flat config with react-hooks and jsx-a11y, Prettier shared; src/lib/env.ts validating VITE_API_URL with zod and a comment that VITE_* is public; Tailwind with a stubbed token layer and class-based dark mode; directory tree; root ErrorBoundary and a hello route."

## User Scenarios & Testing *(mandatory)*

Users: contributors building the M1–M5 UI, CI (#64), the Render static-site build (#66).

### User Story 1 - A runnable, type-safe app (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a clean clone, **When** `npm ci && npm run dev` in `web/`, **Then** the app is served at `localhost:5173` and the hello route renders.
2. **Given** a type error, **When** `npm run build`, **Then** the build fails; otherwise it produces `web/dist`.
3. **Given** the scaffold, **Then** `npm run lint`, `npm run typecheck` and `npm test` pass.
4. **Given** an `@/…` import, **Then** it resolves in the type checker, the dev server and the built bundle.

---

### User Story 2 - Configuration fails loudly (Priority: P1)

**Acceptance Scenarios**:

1. **Given** `VITE_API_URL` is missing, **When** dev or build starts, **Then** it fails with a message naming `VITE_API_URL`.
2. **Given** the browser bundle starts without a valid value, **Then** a readable message names the variable instead of a blank page.
3. **Given** the repo, **Then** `web/.env` is ignored and `web/.env.example` is tracked.

---

### User Story 3 - The agreed layout and styling base (Priority: P2)

**Acceptance Scenarios**:

1. **Given** the tree, **Then** `src/app`, `src/features/{auth,projects,tasks}`, `src/components/{ui,layout}`, `src/lib`, `src/styles` exist.
2. **Given** Tailwind, **Then** a token layer stub exists and dark mode toggles by a `dark` class on `<html>`.
3. **Given** a render error, **Then** the root error boundary shows a fallback instead of unmounting the app.

### Edge Cases

- `VITE_*` values are inlined at build time and public — never secrets.
- A malformed `VITE_API_URL` (not a URL) is rejected like a missing one.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Independent `web/package.json`; no root workspace.
- **FR-002**: TypeScript strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` (same flags as `server/`, #75).
- **FR-003**: Scripts `dev`, `build` (`tsc -b && vite build`), `preview`, `lint`, `typecheck`, `test`, `test:e2e`.
- **FR-004**: ESLint 9 flat config with type-aware TS rules, react-hooks, jsx-a11y, Prettier last.
- **FR-005**: `src/lib/env.ts` validates `import.meta.env` with zod; `vite.config.ts` validates at dev/build start.
- **FR-006**: Tailwind v4 with a stubbed token layer and class-based dark mode.
- **FR-007**: Root `ErrorBoundary`, providers (TanStack Query), router with a hello route.
- **FR-008**: Commit hooks lint and format staged `web/` files.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Clean clone → running app in two commands.
- **SC-002**: 100% of type errors fail the build.
- **SC-003**: Missing `VITE_API_URL` is named in the failure in 100% of start paths (dev, build, browser).

## Assumptions

- **No workspaces** (the recorded layout decision).
- **React Router**, pinned to **v7**: v8 requires Node ≥ 22.22, above the project floor 22.12. `jsdom` pinned to **28** for the same reason (29 needs 22.13, 30 needs 22.22).
- **TypeScript 6.0** and **ESLint 9**, as on the server (#75): `typescript-eslint` 8 peers TS < 6.1.
- **`vite-plugin-checker` added** (issue recommendation): type errors in the dev overlay.
- **`test:e2e` is defined but Playwright is not installed** — the E2E harness belongs to M7, as `lint` was defined in #1 before #2 made it runnable.
- **Prettier**: `web/.prettierrc` mirrors `server/.prettierrc` (each app stays self-contained; there is no root package to hold a shared config).
- Files are written by hand to match the trimmed `react-ts` template, rather than running the interactive `npm create vite`.
