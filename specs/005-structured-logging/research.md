# Research: Structured logging

## R1 — reqId at top level, once

- **Finding** (probe against pino-http 11): by default the per-request child logger binds the whole serialised `req` to every line and there is no top-level `reqId`.
- **Decision**: `quietReqLogger: true` → child binds only `reqId`; the completion line still carries `req`/`res`.

## R2 — Request id for code outside the request logger

- **Decision**: AsyncLocalStorage set by a middleware after pino-http; the base logger's `mixin` adds `reqId` from it **only if the logger has no `reqId` binding** (pino passes the logger as the mixin's third argument).
- **Rationale**: Services log through the shared logger without receiving `req`. Without the binding check, request-logger lines would carry `reqId` twice.

## R3 — Redaction paths

- **Decision**: For each sensitive key: `key`, `*.key`, `*.*.key`; plus `req.headers.authorization`, `req.headers.cookie`, `res.headers["set-cookie"]`, `DATABASE_URL`, `JWT_SECRET`, and `secret` (covers `config.jwt.secret`).
- **Rationale**: `*.password` alone matches only one level below the root; request bodies sit at `req.body.password`.

## R4 — Error serialisation

- **Decision**: `serializers.err` and `serializers.error` = `pino.stdSerializers.err`.

## R5 — Header name and trust

- **Decision**: `x-request-id`; accept incoming only if `/^[\w.:-]{1,128}$/`, else `randomUUID()`.

## R6 — Testability

- **Decision**: `createApp({ logger })` and `createLogger({ destination })` so tests capture lines in memory. Because the app now imports config, `vitest.config.js` supplies a complete test environment (`LOG_LEVEL=silent`).

## R7 — Sampling

- **Decision**: none, recorded in a code comment so nobody adds it speculatively.
