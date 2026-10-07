# Implementation Plan: Express application bootstrap with security middleware

**Branch**: `006-app-bootstrap-security` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

Turn `createApp()` into the full, ordered middleware chain with helmet, credentialed CORS,
compression, bounded body parsing, an `/api/v1` router and a minimal error shape; tighten the
`CORS_ORIGINS` rule so `*` never starts.

## Technical Context

**Language/Version**: JavaScript ESM, Node >=22.12

**Primary Dependencies**: express 5, helmet, cors, compression (all installed in #1)

**Storage**: N/A

**Testing**: Vitest + Supertest against `createApp({ config, logger })`

**Target Platform**: Render web service behind one proxy hop

**Project Type**: web-service

**Constraints**: no side effects on `createApp()`; body limit 100 KB

## Constitution Check

Constitution is the unfilled template — nothing to check. README non-negotiables: no new env var
(the `CORS_ORIGINS` default changes; `.env.example` updated in the same change). Pass.

## Project Structure

```text
server/
├── .env.example                         # CORS_ORIGINS comment/default
├── src/app.js                           # ordered chain, createApp({ logger, config })
├── src/routes/index.js                  # createApiRouter()
├── src/middlewares/error-handler.js     # notFound + errorHandler (minimal #7 shape)
├── src/config/env.js                    # CORS default + * refused everywhere
├── src/server.js                        # logs bound address
└── tests/integration/app.test.js        # headers, 413, 400, 404, CORS, independence
```

## Complexity Tracking

None.
