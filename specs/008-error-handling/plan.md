# Implementation Plan: Centralised error handling

**Branch**: `008-error-handling` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

Add the `AppError` hierarchy, extend the #6 error handler into the full mapping (AppError, zod,
pg, body-parser, fallback) with 4xx/5xx logging rules, pin Express 5's promise forwarding with a
test, and install process-level fatal handlers in the entrypoint.

## Technical Context

**Language/Version**: TypeScript 6.0, Node >=22.12

**Primary Dependencies**: express 5, zod 4, pino (all installed)

**Storage**: N/A (pg codes mapped by value)

**Testing**: Vitest + Supertest with a test-only router injected into `createApp`

**Project Type**: web-service

## Constitution Check

Constitution is the unfilled template — nothing to check. README non-negotiables: no SQL, no env
vars. Pass.

## Project Structure

```text
server/src/utils/errors.ts                 # AppError + subclasses
server/src/middlewares/error-handler.ts    # full mapping + logging rules
server/src/app.ts                          # createApp({ routes }) hook for tests
server/src/server.ts                       # unhandledRejection / uncaughtException
server/tests/unit/errors.test.ts
server/tests/integration/errors.test.ts
```

**Test seam**: `createApp({ apiRouter })` lets a test mount handlers under `/api/v1` before the 404,
instead of building a parallel app that could drift from the real chain.

## Complexity Tracking

None.
