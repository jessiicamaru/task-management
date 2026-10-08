# Research

## R1 — Closing keep-alive sockets

- **Decision**: `server.close()` (Node 19+ also closes idle connections), `closeIdleConnections()` immediately, then `closeAllConnections()` once in-flight reaches 0 — at that point every remaining socket is idle.

## R2 — Counting requests

- **Decision**: middleware first in the chain; decrement once on `finish` or `close` (aborted clients fire only `close`).

## R3 — Testability

- **Decision**: `exit` injected; signals registered by `start()` and removable by `dispose()`. Windows cannot deliver a catchable SIGTERM via `kill`, so the real-signal spawn test is Linux-only.

## R4 — Library or own code

- **Decision**: own code, per the issue.
