# server — Task Management API

Node.js 22 + Express 5 + PostgreSQL 16. This directory is a self-contained application: its own
`package.json`, `Dockerfile` and test suite. Nothing outside it imports from it — the frontend talks
to it over HTTP only.

> **Not built yet.** Implementation starts at
> [#1](https://github.com/jessiicamaru/task-management/issues/1) and runs through
> [M1–M8](https://github.com/jessiicamaru/task-management/milestones). Every path below is what will
> exist, not what does.

## Planned layout

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

## Scripts (once #1 lands)

| Script | Purpose |
| --- | --- |
| `npm run dev` | watch mode |
| `npm start` | production entrypoint |
| `npm run lint` | ESLint 9 flat config |
| `npm test` / `npm run test:coverage` | Vitest + Supertest |
| `npm run migrate:up` / `migrate:down` / `migrate:status` | node-pg-migrate |
| `npm run seed` | demo users, projects and tasks |

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
