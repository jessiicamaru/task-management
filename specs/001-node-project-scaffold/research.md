# Research: API project scaffold

## R1 — Module system

- **Decision**: ESM (`"type": "module"`).
- **Rationale**: The backlog assumes it; changing later touches every file. Express 5, pino, zod and
  Vitest are ESM-friendly.
- **Alternatives considered**: CommonJS — no benefit for a greenfield Node 22 service.

## R2 — Node version floor

- **Decision**: `"engines": { "node": ">=22.12.0" }`, `.nvmrc` = `22`.
- **Rationale**: Vitest 5 declares `engines.node: ^22.12.0 || ^24.0.0 || >=26.0.0`. The issue's
  `>=22` would admit 22.0–22.11, which install fine and then break at `npm test`. 22 is the LTS
  the README, Dockerfile (#37) and CI (#41) are written against.
- **Alternatives considered**: Node 24 — newer LTS, but the root README and `server/README.md`
  already commit to 22; switching is a cross-issue decision, not one to make in a scaffold.

## R3 — Peer-dependency cleanliness

- **Decision**: `pg@^8`, `node-pg-migrate@^9`; do not install `@types/pg`.
- **Rationale**: node-pg-migrate 9 peers `pg >=4.3 <9` (satisfied) and `@types/pg` (optional in
  practice; npm 7+ auto-installs peers only when not marked optional — verified at install time,
  acceptance requires zero warnings).
- **Alternatives considered**: Pinning exact versions — the lockfile already pins; carets keep
  `npm update` useful.

## R4 — `dev` watcher

- **Decision**: `node --watch src/server.js`.
- **Rationale**: Built into Node 22; one fewer dependency than nodemon.

## R5 — Items the repo already satisfies

- `docs/` in the issue's tree is repository-root by the issue's own monorepo note, and exists.
- `LICENSE` (MIT, 2026) exists at the root. A second copy in `server/` would drift.
- Root `.gitignore` already covers `node_modules/`, `.env`, `coverage/`, `*.log`, `.DS_Store`.
- `server/README.md` exists and is fuller than a placeholder; only its "Not built yet" note and the
  scripts table need to match reality.

## R6 — Lint / format tools

- **Decision**: Define `lint` / `format` scripts; do not install ESLint or Prettier here.
- **Rationale**: Issue #2 owns ESLint 9 flat config, Prettier and EditorConfig. ESLint ≥9 exits with
  an error when no config file exists, so installing it here without config adds nothing.
- **Note**: The current ESLint major on npm is 10, while #2's title says "ESLint 9" — flag for #2.

## R7 — App / server split

- **Decision**: `src/app.js` exports `createApp()`; `src/server.js` imports it, reads `PORT`
  (default 3000), calls `listen`, and exits non-zero on a listen error (e.g. `EADDRINUSE`).
- **Rationale**: Tests use Supertest on the app with no open port; graceful shutdown (#9) and
  config (#4) slot into `server.js` later.
