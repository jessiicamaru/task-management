# Research: Validated environment configuration

## R1 — Pure parser + thin loader

- **Decision**: `src/config/env.js` exports `parseEnv(source)` (pure: returns `{ ok, env }` or `{ ok: false, errors: ['KEY: reason'] }`) and `loadEnv()` (dotenv outside production → `parseEnv(process.env)` → print and exit on failure). `src/config/index.js` calls `loadEnv()` at import and exports the structured, deep-frozen `config`.
- **Rationale**: Unit tests exercise every rule with plain objects, no process mutation; one integration test spawns the server to prove the exit path.

## R2 — dotenv

- **Decision**: `dotenv` with `{ quiet: true }`, called only when `process.env.NODE_ENV !== 'production'`.
- **Rationale**: Issue names dotenv; recent majors log an injection tip by default. Alternative `process.loadEnvFile()` (built in) throws on a missing file and is less familiar.

## R3 — Error messages never carry values

- **Decision**: Custom zod error messages (`required`, `must be an integer between 1 and 65535`, …); output is built from `issue.path` + `issue.message` only. zod 4 default messages can embed received values for enums/literals, so every field sets its own message.

## R4 — Booleans and lists

- **Decision**: `DATABASE_SSL` accepts `true|false|1|0` (case-insensitive) via a custom transform — `z.coerce.boolean('false')` is `true`. `CORS_ORIGINS` splits on commas, trims, drops empties.

## R5 — Production cross-field rules

- **Decision**: A separate `productionErrors(input)` runs on the raw input and its errors are merged with the schema's: `JWT_SECRET` length ≥ 32 and ≠ placeholder; `CORS_ORIGINS` present and without `*`. Placeholder constant exported from `env.js` and used verbatim in `.env.example` (a test asserts they match).
- **Rationale**: The first draft used zod `superRefine`; zod skips object-level refinements once any field fails, so a short production secret went unreported whenever another variable was also wrong — breaking the "one aggregated report" requirement. Found by smoke test, covered by a unit test.

## R6 — Lint rules inside config

- `no-process-env` already exempt in `src/config/**` (#2). Printing happens before the logger exists (the logger needs `LOG_LEVEL`), so `console.error` + `process.exit(1)` in `loadEnv` carry reasoned disables.
