# Data Model: Configuration

`config` (deep-frozen), built from the validated environment:

| Group | Field | Source | Type / default |
| --- | --- | --- | --- |
| `env` | — | `NODE_ENV` | `development` \| `test` \| `production`, default `development` |
| `http` | `port` | `PORT` | int 1–65535, default 3000 |
| `http` | `corsOrigins` | `CORS_ORIGINS` | string[]; default `['*']` outside production; required, no `*`, in production |
| `db` | `url` | `DATABASE_URL` | `postgres://` / `postgresql://` URL, required |
| `db` | `ssl` | `DATABASE_SSL` | boolean, default false |
| `db` | `poolMax` | `DB_POOL_MAX` | int ≥ 1, default 10 |
| `jwt` | `secret` | `JWT_SECRET` | string, required; prod: ≥ 32 chars, ≠ placeholder |
| `jwt` | `accessTtl` | `JWT_ACCESS_TTL` | duration `<n>[smhd]`, default `15m` |
| `jwt` | `refreshTtl` | `JWT_REFRESH_TTL` | duration, default `7d` |
| `log` | `level` | `LOG_LEVEL` | fatal\|error\|warn\|info\|debug\|trace\|silent, default `info` |
| `rateLimit` | `windowMs` | `RATE_LIMIT_WINDOW_MS` | int ≥ 1, default 60000 |
| `rateLimit` | `max` | `RATE_LIMIT_MAX` | int ≥ 1, default 100 |

Convenience flags: `config.isProduction`, `config.isTest`.
