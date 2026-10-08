# Research

## R1 — Node floor

- `react-router@8` engines `>=22.22.0` → pin `^7.18`. `jsdom@30` `^22.22.2`, `@29` `^22.13` → pin `^28` (`^22.12.0`).

## R2 — Tailwind v4

- No `tailwind.config.js`; `@import "tailwindcss"`, tokens in `@theme`, class dark mode via `@custom-variant dark (&:where(.dark, .dark *))`.

## R3 — Env validation at two points

- `vite.config.ts` uses `loadEnv` + the same zod schema, so `npm run dev`/`build` fail in the terminal; `src/lib/env.ts` re-validates in the browser and `main.tsx` renders a readable message instead of a blank page.

## R4 — TypeScript / ESLint

- TS `~6.0.3`, ESLint 9, typescript-eslint type-checked — same as `server/` (#75).
