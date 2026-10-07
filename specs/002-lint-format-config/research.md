# Research: Lint and format configuration

## R1 — ESLint major

- **Decision**: `eslint@^9`, `@eslint/js@^9`.
- **Rationale**: `eslint-plugin-import@2.32` peers `eslint ^2 … ^9`; ESLint 10 would produce a peer warning.
- **Alternatives considered**: `eslint-plugin-import-x` (supports 10) — a different plugin from the one the issue names; revisit on upgrade.

## R2 — Floating promises

- **Decision**: `no-return-await: error`, `require-await: off`, `eslint-plugin-promise` recommended + `promise/catch-or-return: error`.
- **Rationale**: A true `no-floating-promises` needs type information (typescript-eslint); the issue accepts this minimum.

## R3 — Node rules

- **Decision**: `eslint-plugin-n` `flat/recommended-module`; `n/no-unpublished-import` off for `tests/**` and `eslint.config.js` (dev deps are legitimately imported there); `n/no-process-exit` off in `src/server.js` (the entrypoint is where exiting belongs).

## R4 — Where the scaffold violates the new rules

- `src/server.js`: `process.env.PORT` (no-process-env) and `console.*` (no-console) → reasoned inline disables pointing at #4 and #5.
- `src/db/seed.js`: `console.log` → inline disable until the seed uses the logger.

## R5 — EditorConfig location

- **Decision**: repository root.
- **Rationale**: Root `.gitattributes` already enforces LF repo-wide; the editor setting should match that scope. `web/` and `docker/` benefit too.

## R6 — Import order groups

- **Decision**: groups builtin, external, internal, then parent/sibling/index together; `newlines-between: always`; alphabetized ascending.
