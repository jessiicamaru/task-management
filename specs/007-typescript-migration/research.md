# Research: Move the API to TypeScript

## R1 — Compile vs strip

- **Decision**: `tsc -p tsconfig.build.json` → `dist/`; `node dist/server.js` in production; `tsx watch` in development.
- **Rationale**: Type stripping is unflagged only from Node 22.18 / 23.6; the floor is 22.12. A compiled `dist/` keeps the Docker image (#37) free of dev tooling.

## R2 — TypeScript version

- **Decision**: `typescript@~6.0.3`.
- **Rationale**: `typescript-eslint@8.71` peers `typescript >=4.8.4 <6.1.0`; TypeScript 7 (native) would produce a peer warning.
- **Note**: TS 6 defaults `types` to `[]`, so `types: ["node"]` is explicit.

## R3 — Module settings

- **Decision**: `module`/`moduleResolution: NodeNext`, `target: ES2023`, `verbatimModuleSyntax: true`; import specifiers keep `.js` (NodeNext resolves them to `.ts`).

## R4 — Request augmentation

- **Decision**: `src/types/express.d.ts` is unnecessary — `pino-http` already augments `IncomingMessage` with `id` and `log`. Verified by type check.

## R5 — Lint

- **Decision**: `typescript-eslint` `recommendedTypeChecked` with `projectService`; `eslint-plugin-n` `flat/recommended-module` kept but `n/no-missing-import` off for `.ts` (TypeScript resolves imports; the plugin does not map `.js`→`.ts`); `import/order` kept with `eslint-import-resolver-typescript`; tooling `.js` files linted without type info.

## R6 — Boot test

- **Decision**: the spawn test runs `src/server.ts` through `tsx` (`node --import tsx`) so it does not depend on a prior build.

## R7 — Config files

- **Decision**: stay `.js` (see spec Assumptions).
