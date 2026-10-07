# 0007. The API is written in TypeScript and compiled to `dist/`

- **Status:** accepted
- **Date:** 2026-10-07
- **Deciders:** jessiicamaru

## Context

The API in `server/` started as plain JavaScript (ESM). The web client (#51) was always going to be
TypeScript with `strict: true`, so every vertical slice (auth, projects, tasks) would have been
written in two languages, and nothing type-checked the server's own seams — the config object, the
error response shape, `createApp`'s options. ESLint could only approximate catching an un-awaited
promise (`no-return-await`, `promise/catch-or-return`), because the real rule needs type
information; an un-awaited promise in an Express handler hangs the request and logs nothing.

The switch was made after #1–#6, while the server was about ten real modules ([#75](https://github.com/jessiicamaru/task-management/issues/75)).

How to run it was the real fork:

- **Strip types at runtime** (`node file.ts`): unflagged only from Node 22.18 / 23.6, and no enums
  or parameter properties. The project floor is Node 22.12.
- **Run through `tsx` in production**: a dev dependency in the runtime image, and a loader on the
  hot path for no benefit.
- **Compile with `tsc` to `dist/`**: one build step, plain JavaScript at runtime.

## Decision

`server/` is TypeScript under `strict`, `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes` (the same flags as `web/`). `npm run build` compiles `src/` to `dist/`
with `tsc`; production runs `node dist/server.js`; development runs `tsx watch src/server.ts`; tests
run the `.ts` sources directly through Vitest. Lint is `typescript-eslint` with type information,
and `@typescript-eslint/no-floating-promises` / `no-misused-promises` are errors.

## Consequences

- Config is typed from the zod schema (`Env = z.output<…>`), so a renamed variable is a compile
  error everywhere it is used.
- Unhandled promises fail lint, not production.
- **There is a build step.** The Dockerfile (#37) must run `npm run build` in a build stage and
  copy only `dist/` and production dependencies into the runtime stage. CI (#41) must run
  `npm run typecheck` — Vitest and `tsx` strip types without checking them, so tests can pass on
  code that does not type-check.
- Import specifiers end in `.js` even though the files are `.ts` (NodeNext resolution). Writing
  `./app.ts` in an import is a compile error.
- TypeScript is pinned to 6.0.x because `typescript-eslint` 8 supports `<6.1`. Revisit when it
  supports TypeScript 7.
- No types are shared with `web/` through a package — each application stays self-contained; the
  OpenAPI document (#32) is the contract. Revisit if hand-written client types start drifting.
