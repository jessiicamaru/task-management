# Data Model

- `/healthz` → `{ status: "ok", uptime: number (s), version: string }`
- `/readyz` → 200 `{ status: "ready", checks: { database: "ok", latencyMs: number } }` | 503 `{ status: "not_ready", checks: { database: "unreachable" } }`
- `config.build = { version, gitSha }`
