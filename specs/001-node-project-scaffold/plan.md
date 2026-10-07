# Implementation Plan: API project scaffold

**Branch**: `001-node-project-scaffold` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-node-project-scaffold/spec.md`

## Summary

Turn the empty `server/` directory into a runnable Node.js application: an ESM package manifest
with the backlog's runtime and dev dependencies, a committed lockfile, the ten npm script names
that CI / Docker / Render will call, the agreed directory tree with per-module layer placeholders,
and a minimal Express 5 app (`src/app.js`) started by `src/server.js` that answers `GET /` with 200.
One Vitest + Supertest test locks that behaviour in.

## Technical Context

**Language/Version**: JavaScript (ES modules) on Node.js 22 LTS — floor `>=22.12.0`; `.nvmrc` = `22`

**Primary Dependencies**: express 5, pg 8, zod 4, pino 10 / pino-http 11, helmet, cors, compression,
jsonwebtoken, express-rate-limit (installed, only express wired); dev: vitest 5, supertest 7,
node-pg-migrate 9

**Storage**: N/A for this feature (PostgreSQL arrives in M2)

**Testing**: Vitest (`vitest run`) + Supertest against the exported app

**Target Platform**: Linux container (Render) and developer machines (Windows/macOS/Linux)

**Project Type**: web-service (API half of a two-app monorepo; `web/` is separate)

**Performance Goals**: N/A — boot time only; `npm start` to listening in well under a second

**Constraints**: `npm ci` with zero peer-dependency warnings; `git status` clean after a run

**Scale/Scope**: ~30 placeholder files, 1 route, 1 test

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**The constitution is unfilled.** `.specify/memory/constitution.md` is still the Spec Kit template
(`[PROJECT_NAME] Constitution`, `[PRINCIPLE_1_NAME]` …), so there are no ratified gates to check
and this section passes vacuously — it checked nothing.

In its absence the plan was checked against the rules the repo *does* state, in
`server/README.md` → "Non-negotiables":

| Rule | Applies here? | Status |
| --- | --- | --- |
| Parameterized SQL only | No SQL yet | n/a |
| Pool client released on every path | No pool yet | n/a |
| Identity from verified token only | No auth yet | n/a |
| New env var → `.env.example`, compose, Render in same change | `PORT` is read with a default; `.env.example` is owned by #4 | Deferred to #4 — noted |
| Migrations expand before contract | No migrations yet | n/a |
| HTTP / business logic / SQL in separate files | Module layer placeholders enforce the split | Pass |

Post-design re-check: unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/001-node-project-scaffold/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http-root.md
│   └── npm-scripts.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
server/
├── .nvmrc
├── package.json
├── package-lock.json
├── README.md                     # exists; "Not built yet" note updated
├── src/
│   ├── server.js                 # entrypoint: PORT, listen, fail fast on listen error
│   ├── app.js                    # createApp() → Express app, GET / → 200
│   ├── config/.gitkeep
│   ├── db/seed.js                # placeholder, exits 0
│   ├── middlewares/.gitkeep
│   ├── modules/
│   │   ├── auth/      auth.{routes,controller,service,repository,schema}.js
│   │   ├── users/     users.{…}.js
│   │   ├── projects/  projects.{…}.js
│   │   ├── tasks/     tasks.{…}.js
│   │   └── health/    health.{…}.js
│   └── utils/.gitkeep
├── migrations/.gitkeep
└── tests/
    ├── unit/.gitkeep
    └── integration/app.test.js   # GET / → 200, unknown path → 404
```

**Structure Decision**: Only `server/` is touched. `docs/`, `LICENSE` and the ignore rules already
exist at the repository root and satisfy the issue's items 5 (docs), 6 and 8 — see research R5.

## Complexity Tracking

No violations to justify.
