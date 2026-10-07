# Implementation Plan: Validated environment configuration

**Branch**: `004-env-config` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

One zod schema validates the whole environment at boot; failures print `KEY: reason` lines (no
values) and exit 1. A frozen, grouped `config` replaces every `process.env` read. `.env.example`
documents all twelve variables.

## Technical Context

**Language/Version**: JavaScript ESM, Node >=22.12

**Primary Dependencies**: zod 4 (installed), dotenv (new runtime dependency)

**Storage**: N/A

**Testing**: Vitest unit tests on `parseEnv`; one integration test spawning `src/server.js`

**Target Platform**: Render web service, Docker, local

**Project Type**: web-service

**Constraints**: no secret values in output; `.env` ignored in production

## Constitution Check

Constitution is the unfilled template — nothing to check. `server/README.md` non-negotiable "a new
environment variable lands in `.env.example`, the compose file and Render in the same change":
`.env.example` is added here; compose (#36) and `render.yaml` (#46) do not exist yet and must take
all twelve variables when they land. Pass, with that note.

## Project Structure

```text
server/
├── .env.example
├── src/config/env.js          # schema, parseEnv, loadEnv
├── src/config/index.js        # config (grouped, frozen)
├── src/server.js              # port from config
└── tests/
    ├── unit/config.env.test.js
    └── integration/config.boot.test.js
```

Data model: [data-model.md](data-model.md). Validation: [quickstart.md](quickstart.md).

## Complexity Tracking

None.
