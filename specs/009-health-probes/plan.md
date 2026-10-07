# Implementation Plan: Liveness and readiness probes

**Branch**: `009-health-probes` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

Health module in the routes/controller/service/repository layout: `/healthz` from process state
only, `/readyz` from an injected `checkDatabase()` bounded by a 2 s timeout. Version from
`package.json` + optional `GIT_SHA`.

## Technical Context

**Language/Version**: TypeScript 6.0, Node >=22.12

**Primary Dependencies**: express 5, pg 8 (installed)

**Storage**: PostgreSQL — one `SELECT 1` per readiness probe

**Testing**: Supertest with injected checks; real unreachable path against a closed port

**Project Type**: web-service

## Constitution Check

Constitution is the unfilled template — nothing to check. README non-negotiables:
- Parameterized SQL: `SELECT 1` has no parameters. Pass.
- Pool client released on every path: no pool yet; the one-shot client is `end()`ed in `finally`. Pass.
- New env var (`GIT_SHA`) → `.env.example` now; compose (#36) and Render (#46) do not exist yet. Noted.

## Project Structure

```text
server/src/config/version.ts                    # package.json version + GIT_SHA
server/src/config/env.ts                        # GIT_SHA (optional, hex 7–40)
server/src/modules/health/health.repository.ts  # pingDatabase(url, ssl, timeoutMs)
server/src/modules/health/health.service.ts     # liveness(), readiness(check, timeoutMs)
server/src/modules/health/health.controller.ts  # handlers
server/src/modules/health/health.routes.ts      # createHealthRouter({ checkDatabase })
server/src/app.ts                               # mount at root; createApp({ checkDatabase })
server/tests/integration/health.test.ts
```

## Complexity Tracking

None.
