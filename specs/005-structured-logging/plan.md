# Implementation Plan: Structured logging with request correlation

**Branch**: `005-structured-logging` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

pino logger with non-negotiable redaction, pino-http with validated/generated `x-request-id`,
status-based levels and quiet probes, an AsyncLocalStorage request context that tags service-level
lines, and a single credential-free startup line.

## Technical Context

**Language/Version**: JavaScript ESM, Node >=22.12

**Primary Dependencies**: pino 10, pino-http 11 (installed in #1); pino-pretty (new, dev)

**Storage**: N/A

**Testing**: Vitest + Supertest with an injected logger writing to an in-memory destination

**Target Platform**: Render (JSON lines), local terminal (pretty)

**Project Type**: web-service

**Constraints**: no credentials in output; no duplicate keys per line

## Constitution Check

Constitution is the unfilled template — nothing to check. README non-negotiables: no new env vars
(`LOG_LEVEL` exists since #4); "identity from the verified token" unaffected. Pass.

## Project Structure

```text
server/
├── vitest.config.js                    # test env so importing the app validates cleanly
├── src/app.js                          # createApp({ logger }) wires request logger + context
├── src/server.js                       # startup line, fatal on listen error
├── src/config/logger.js                # createLogger, REDACT_PATHS, logger
├── src/middlewares/request-logger.js   # pino-http options
├── src/utils/request-context.js        # AsyncLocalStorage
├── src/utils/database-url.js           # host/port/db only
└── tests/
    ├── integration/logging.test.js
    └── unit/database-url.test.js
```

See [research.md](research.md) for the decisions; no data model; validation in [quickstart.md](quickstart.md).

## Complexity Tracking

None.
