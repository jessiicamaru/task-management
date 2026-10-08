# Plan

**Branch**: `012-web-scaffold` | **Spec**: [spec.md](spec.md)

## Summary

Hand-written trimmed `react-ts` Vite app with strict TS, `@/` alias, Tailwind v4 tokens stub, zod-validated env, React Router 7, TanStack Query, error boundary and a hello route; ESLint/Prettier matching the server; hooks extended to `web/`.

## Technical Context

TypeScript 6.0, React 19, Vite 8, Node >=22.12. Tests: Vitest + Testing Library + jsdom.

## Constitution Check

Constitution is the unfilled template — nothing to check. Server non-negotiables do not apply to `web/`; web README conventions (only the API client fetches; no secrets in `VITE_*`) are respected. Pass.

## Project Structure

See [tasks.md](tasks.md); tree per `web/README.md`.
