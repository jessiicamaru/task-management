# Plan

**Branch**: `011-request-validation` | **Spec**: [spec.md](spec.md)

## Summary

`validate()` middleware + shared schemas; #7 handler gains `code` and per-key unknown-key details.

## Technical Context

TypeScript 6.0, express 5, zod 4.6. Tests: Supertest with injected `apiRouter`.

## Constitution Check

Constitution is the unfilled template — nothing to check. No SQL, no env vars. Pass.

## Project Structure

```text
server/src/middlewares/validate.ts
server/src/utils/schemas.ts
server/src/types/express.d.ts
server/src/middlewares/error-handler.ts
server/tests/integration/validation.test.ts
server/tests/unit/schemas.test.ts
```
