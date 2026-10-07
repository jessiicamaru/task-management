# Contract: npm scripts in `server/package.json`

Consumed by CI (#41), the Dockerfile (#37), render.yaml (#46) and every later issue. Names and
commands are fixed; change them only together with their consumers.

| Script | Command | Runnable after |
| --- | --- | --- |
| `start` | `node src/server.js` | this feature |
| `dev` | `node --watch src/server.js` | this feature |
| `lint` | `eslint .` | #2 |
| `format` | `prettier --write .` | #2 |
| `test` | `vitest run` | this feature |
| `test:watch` | `vitest` | this feature |
| `migrate:up` | `node-pg-migrate up` | M2 (needs `DATABASE_URL`) |
| `migrate:down` | `node-pg-migrate down` | M2 |
| `migrate:create` | `node-pg-migrate create` | this feature |
| `seed` | `node src/db/seed.js` | this feature (placeholder) |
