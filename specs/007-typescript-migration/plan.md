# Implementation Plan: Move the API to TypeScript

**Branch**: `007-typescript-migration` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

Rename every `server/src` and `server/tests` file to `.ts`, type the public seams, compile with
`tsc` to `dist/`, run dev with `tsx`, and switch lint to type-aware `typescript-eslint` so floating
promises fail CI.

## Technical Context

**Language/Version**: TypeScript 6.0 → ES2023, Node >=22.12

**Primary Dependencies** (dev): typescript, tsx, typescript-eslint, eslint-import-resolver-typescript, @types/node@22, @types/express, @types/cors, @types/compression, @types/jsonwebtoken, @types/pg, @types/supertest

**Storage**: N/A

**Testing**: Vitest (native TS), Supertest; spawn test via `tsx`

**Target Platform**: Render (compiled), local (tsx)

**Project Type**: web-service

**Constraints**: identical HTTP behaviour; no peer warnings

## Constitution Check

Constitution is the unfilled template — nothing to check. README non-negotiables unaffected; the
script-name contract changes only by addition (`build`, `typecheck`) and by `start` pointing at
`dist/` — consumers (#37, #41, #46) do not exist yet. Pass.

## Project Structure

```text
server/
├── tsconfig.json              # strict, NodeNext, noEmit for typecheck (src + tests)
├── tsconfig.build.json        # src only, outDir dist
├── eslint.config.js           # typescript-eslint type-checked
├── package.json               # build, typecheck, start, dev, seed; lint-staged *.{js,ts}
├── src/**/*.ts
└── tests/**/*.ts
docs/adr/0007-typescript-server.md
```

## Complexity Tracking

None.
