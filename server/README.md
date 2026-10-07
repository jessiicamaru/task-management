# server — Task Management API

Node.js 22 + Express 5 + PostgreSQL 16. This directory is a self-contained application: its own
`package.json`, `Dockerfile` and test suite. Nothing outside it imports from it — the frontend talks
to it over HTTP only.

> **Scaffold only.** [#1](https://github.com/jessiicamaru/task-management/issues/1) laid out the
> project and a server that answers `GET /`; the features arrive milestone by milestone. The
> milestones are vertical slices, so this application is built alongside [`web/`](../web) rather
> than ahead of it — M1 boots both, M3 ships sign-in end to end, M5 ships the board. The module
> files below exist as placeholders until their issue lands.

## Getting started

Requires Node.js **22.12 or newer** (`nvm use` reads `.nvmrc`).

```bash
npm ci
npm start              # listens on $PORT, default 3000
curl localhost:3000/   # {"status":"ok"}
npm test
```

## Layout

```
server/
  src/
    server.js          # process entrypoint: config, listener, graceful shutdown
    app.js             # builds the Express app, exported for tests
    config/            # env validation (zod), pino logger
    db/                # pool, transaction helper, seed
    middlewares/       # authenticate, authorize, validate, errors, rate limiting
    modules/
      auth/            # register, login, refresh rotation, logout
      users/           # profile reads
      projects/        # projects + membership
      tasks/           # tasks, status transitions, comments
      health/          # /healthz, /readyz
    utils/
  migrations/          # node-pg-migrate, every one with a working down
  tests/
    unit/
    integration/
  Dockerfile
  package.json
```

Each module holds `*.routes.js`, `*.controller.js`, `*.service.js`, `*.repository.js` and
`*.schema.js`. HTTP concerns, business logic and SQL stay in separate files.

## Scripts

CI, the Dockerfile and Render call these by name — rename one only together with its callers.

| Script | Purpose |
| --- | --- |
| `npm start` | production entrypoint |
| `npm run dev` | watch mode (`node --watch`) |
| `npm run lint` / `npm run lint:fix` | ESLint 9 flat config (`eslint.config.js`) |
| `npm run format` / `npm run format:check` | Prettier (`.prettierrc`); CI runs the check |
| `npm test` / `npm run test:watch` | Vitest + Supertest |
| `npm run migrate:up` / `migrate:down` / `migrate:create` | node-pg-migrate (needs `DATABASE_URL`, M2) |
| `npm run seed` | demo users, projects and tasks (placeholder for now) |

## Commits

`npm ci` installs git hooks (husky): `pre-commit` lints and formats staged files, `commit-msg`
enforces Conventional Commits with a fixed scope list. See [docs/commits.md](../docs/commits.md).

## Non-negotiables

These are checked on every pull request by `/gh-pr-review`:

- **Every query uses `$1, $2` parameters.** No template literal ever interpolates a value into SQL.
- **A pool client is released on every path** — `finally { client.release() }`, or go through
  `withTransaction`. A leaked client exhausts the pool and the service stops answering with nothing
  in the log.
- **Identity comes from the verified token**, never from `req.body.userId` or a query parameter.
- **A new environment variable lands in `.env.example`, the compose file and Render in the same
  change.**
- **Migrations expand before they contract.** Render rolls a new instance in while the old one still
  serves traffic.

## API

Served from the running service at `/api/v1/docs` (Swagger UI) and `/api/v1/openapi.json`, generated
from the zod schemas so it cannot disagree with the validation
([#32](https://github.com/jessiicamaru/task-management/issues/32)).
