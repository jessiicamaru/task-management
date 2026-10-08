---

description: "Task list for the web scaffold (issue #51)"
---

# Tasks: Web app scaffold

**Input**: Design documents from `specs/012-web-scaffold/`

**Tests**: One render test for the hello route and the env schema; build failure on a type error verified manually.

## Phase 1: Setup

- [ ] T001 Create `web/package.json` (private, ESM, engines >=22.12, scripts per issue), `web/.nvmrc`; install runtime and dev deps; no peer warnings
- [ ] T002 [P] `web/tsconfig.json` (references), `web/tsconfig.app.json` (strict flags, `@/*`), `web/tsconfig.node.json` (vite config)
- [ ] T003 [P] `web/vite.config.ts` (react, tailwind, checker, `@` alias, env validation, vitest jsdom), `web/index.html`

## Phase 2: User Story 1 - Runnable app (Priority: P1) 🎯 MVP

- [ ] T004 [US1] `web/src/main.tsx`, `web/src/app/{App,router,providers,ErrorBoundary}.tsx`, `web/src/app/routes/Hello.tsx`
- [ ] T005 [US1] `web/eslint.config.js` (typescript-eslint type-checked, react-hooks, jsx-a11y, import order, Prettier last), `web/.prettierrc`, `web/.prettierignore`
- [ ] T006 [US1] `web/src/app/App.test.tsx` renders the hello route; `web/src/test/setup.ts`

## Phase 3: User Story 2 - Env (Priority: P1)

- [ ] T007 [US2] `web/src/lib/env.ts` (zod schema, `parseEnv`, public-values comment), `web/.env.example`, `web/src/vite-env.d.ts`
- [ ] T008 [US2] `web/src/lib/env.test.ts`; verify dev/build fail naming `VITE_API_URL`

## Phase 4: User Story 3 - Layout and styling (Priority: P2)

- [ ] T009 [P] [US3] `web/src/styles/{index,tokens}.css` (Tailwind v4, `@theme` stub, `dark` custom variant)
- [ ] T010 [P] [US3] Placeholders: `src/features/{auth,projects,tasks}/index.ts`, `src/components/{ui,layout}/index.ts`, `src/lib/index.ts`

## Phase 5: Polish

- [ ] T011 Extend `server/.husky/pre-commit` to run lint-staged in `web/` too; `web/package.json` lint-staged config
- [ ] T012 `web/README.md` getting started; root README quickstart if it references web
- [ ] T013 Verify: `npm ci`, `lint`, `typecheck`, `test`, `build` → `dist`; type error fails `build`; missing `VITE_API_URL` fails; dev serves 5173
