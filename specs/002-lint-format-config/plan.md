# Implementation Plan: Lint and format configuration

**Branch**: `002-lint-format-config` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

Add ESLint 9 flat config, Prettier and EditorConfig to the API so `npm run lint` is a meaningful CI
gate and formatting is uniform. Bring the #1 scaffold to a clean pass.

## Technical Context

**Language/Version**: JavaScript ESM, Node >=22.12

**Primary Dependencies** (dev): eslint 9, @eslint/js 9, globals, eslint-plugin-import, eslint-plugin-n, eslint-plugin-promise, eslint-config-prettier, prettier 3

**Storage**: N/A

**Testing**: Run lint/format against the tree plus deliberate violations

**Target Platform**: developer machines + CI

**Project Type**: web-service tooling

**Constraints**: no peer-dependency warnings; lint passes on existing code

## Constitution Check

The constitution (`.specify/memory/constitution.md`) is still the unfilled template — this gate
checks nothing. Against `server/README.md` non-negotiables: no SQL / auth changes; `no-process-env`
actively supports the "new env var lands in .env.example, compose and Render" rule. Pass.

## Project Structure

```text
.editorconfig                 # repo root (research R5)
server/
├── eslint.config.js
├── .prettierrc
├── .prettierignore
├── package.json              # + lint:fix, format:check, dev deps
├── src/server.js             # reasoned eslint-disable lines
└── src/db/seed.js            # reasoned eslint-disable line
```

Contracts: [npm-scripts](contracts/npm-scripts.md). Data model: none. Validation: [quickstart](quickstart.md).

## Complexity Tracking

None.
