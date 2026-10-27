# Database workflow

The API uses PostgreSQL 16 through one shared, bounded connection pool. Copy
`server/.env.example` to `server/.env`, create the database named by `DATABASE_URL`, then run:

```bash
cd server
npm run migrate:up
npm run migrate:status
npm run seed
```

The demo password is `Password123!` for `alice@example.com`, `bob@example.com`, and
`carol@example.com`. Alice owns two projects, Bob belongs to one, and Carol is the authorization
test outsider. Generate a planner-sized dataset with `npm run seed -- --tasks 50000`.

Create migrations with `npm run migrate:create -- descriptive-name`. Migrations are timestamped,
ordered, SQL-in-JavaScript files with a working `down`. `node-pg-migrate` uses a PostgreSQL advisory
lock by default, so simultaneous app boots cannot apply a migration twice. The container will run
migrations before starting the API; consequently a bad migration intentionally blocks that boot.

Use expand/deploy/backfill/contract for schema changes: add compatible columns first, deploy code
that handles both shapes, backfill, and remove old columns only in a later release. Render can run
old and new instances together during a rollout.

Repository functions that accept a transaction client must use that client for every query in the
operation. Functions without one use the shared pool. Mixing them makes part of an operation commit
outside its transaction. All SQL values use `$1`, `$2`, ... parameters; never interpolate values.

Expired refresh-token records older than the 30-day forensic window can be removed with
`npm run db:cleanup`.
