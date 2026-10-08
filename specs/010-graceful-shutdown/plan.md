# Implementation Plan: Graceful shutdown on SIGTERM

**Branch**: `010-graceful-shutdown` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

## Summary

A lifecycle object (draining flag + in-flight counter middleware) shared by the app and the
shutdown sequence; a `start()` function owning the server handle, timeouts and signal handlers;
`server.ts` becomes a one-line call to it.

## Technical Context

**Language/Version**: TypeScript 6.0, Node >=22.12 (`server.closeIdleConnections`, `closeAllConnections`)

**Primary Dependencies**: express 5, pino (installed)

**Testing**: in-process with injected `exit`; `process.emit('SIGTERM')`; spawn + real signal on non-Windows

**Project Type**: web-service

## Constitution Check

Constitution is the unfilled template — nothing to check. README non-negotiables: new env var
`SHUTDOWN_TIMEOUT_MS` → `.env.example` now; compose (#36) and Render (#46) do not exist yet. Pass, noted.

## Project Structure

```text
server/src/lifecycle.ts          # createLifecycle(): draining, inFlight, middleware, idle()
server/src/shutdown.ts           # createShutdown({ server, lifecycle, logger, timeoutMs, closers, exit })
server/src/start.ts              # start(options): listen, timeouts, signals; returns { server, shutdown, dispose }
server/src/server.ts             # start()
server/src/app.ts                # createApp({ lifecycle }) mounts the counter first
server/src/modules/health/*      # readiness 503 while draining
server/src/config/env.ts         # SHUTDOWN_TIMEOUT_MS
server/tests/integration/shutdown.test.ts
```

## Complexity Tracking

None.
