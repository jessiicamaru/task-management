# Research

## R1 — Default database check before #10

- **Decision**: one-shot `pg.Client` (`connectionTimeoutMillis` 2000, `query_timeout` 2000), `end()` in `finally`; injected so #10 swaps in the pool.

## R2 — Timeout

- **Decision**: `Promise.race` against a 2 s timer in the service, independent of driver timeouts, so a black-holed connection cannot hang the probe.

## R3 — Version

- **Decision**: read `package.json` relative to the module (same depth from `src/config` and `dist/config`); semver build metadata `+sha7`.

## R4 — Removing `GET /`

- **Decision**: remove; it was the scaffold signal "superseded by /healthz (#8)".
