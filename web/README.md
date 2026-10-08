# web — Task Management UI

React 19 + Vite + TypeScript single-page app. Talks to [`server/`](../server) over REST; it has no
backend of its own and holds no secrets — everything it ships is public by definition.

> **Scaffold only.** [#51](https://github.com/jessiicamaru/task-management/issues/51) laid out the
> app, its tooling and a hello route; the design system is
> [#56](https://github.com/jessiicamaru/task-management/issues/56), and each capability arrives with
> its milestone, built alongside [`server/`](../server) rather than after it.

## Getting started

Requires Node.js **22.12 or newer** (`nvm use` reads `.nvmrc`).

```bash
npm ci
cp .env.example .env   # VITE_API_URL — validated at dev/build start and again in the browser
npm run dev            # http://localhost:5173, type errors in the overlay
npm run build          # tsc -b, then vite build → dist/
```

| Script | Purpose |
| --- | --- |
| `npm run dev` / `npm run preview` | Vite dev server / serve the built `dist/` |
| `npm run build` | `tsc -b && vite build` — Vite does not type-check, so `tsc` runs first and fails the build |
| `npm run typecheck` | `tsc -b` over the app and the Vite config |
| `npm run lint` | ESLint 9 with type-aware `typescript-eslint`, `react-hooks`, `jsx-a11y` |
| `npm test` | Vitest + Testing Library (jsdom) |
| `npm run test:e2e` | Playwright — runnable once the E2E harness lands (M7) |

TypeScript runs under the same strict flags as the server. Imports use the `@/` alias for `src/`
(configured in both `tsconfig.app.json` and `vite.config.ts`). Tailwind v4 reads its tokens from
[`src/styles/tokens.css`](src/styles/tokens.css); dark mode follows a `dark` class on `<html>`.
Commit hooks (installed by `npm ci` in `server/`) lint and format staged `web/` files once this
app's dependencies are installed.

## Layout

```
web/
  src/
    app/               # router, providers, error boundary
    features/
      auth/            # login, register, session, silent refresh
      projects/        # list, detail, members
      tasks/           # board, filters, detail drawer, comments
    components/
      ui/              # design-system primitives
      layout/          # app shell, nav
    lib/
      api-client.ts    # typed fetch wrapper, error mapping, refresh-on-401
      query.ts         # TanStack Query setup
    styles/
  index.html
  vite.config.ts
  package.json
```

## Stack

| Concern | Choice |
| --- | --- |
| Framework | React 19 + TypeScript, Vite |
| Routing | React Router |
| Server state | TanStack Query — caching, retries and invalidation belong there, not in `useEffect` |
| Forms | React Hook Form + zod, sharing the API's validation rules |
| Styling | Tailwind CSS with design tokens |
| Testing | Vitest + Testing Library, Playwright for E2E |

## Deployment

A **Render Static Site** (free tier, no container, no cold start), built with `npm run build` and
published from `web/dist`. `VITE_API_URL` points at the API service, and the API's `CORS_ORIGINS`
must list the static site's origin — those two settings are a pair, and changing one without the
other is the most common way this deployment breaks.

Vite inlines `VITE_*` variables into the bundle at **build** time. They are public: anything secret
must stay on the server.

## Conventions

- **The API client is the only place that calls `fetch`.** A component that fetches directly cannot
  be given retries, auth refresh or consistent error handling.
- **Errors are rendered from the API's error shape** (`code`, `message`, `requestId`). Surface the
  request id in the UI — it is what makes a screenshot searchable in the logs.
- **Access tokens live in memory, not `localStorage`.** The refresh token is handled per the
  decision recorded in [#53](https://github.com/jessiicamaru/task-management/issues/53).
- Every interactive element is reachable by keyboard and labelled. Accessibility is part of the
  acceptance criteria, not a follow-up.
