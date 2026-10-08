# Feature Specification: Graceful shutdown on SIGTERM

**Feature Branch**: `010-graceful-shutdown`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Implement GitHub issue #9 (https://github.com/jessiicamaru/task-management/issues/9): feat(api): graceful shutdown on SIGTERM — keep the http.Server handle, handle SIGTERM/SIGINT; sequence: /readyz → 503, server.close(), wait for in-flight requests (counter middleware) up to SHUTDOWN_TIMEOUT_MS (default 10000), pool.end(), flush pino, exit 0; hard timer logs outstanding requests and exits 1; idempotent; keepAliveTimeout/headersTimeout above the proxy idle timeout and idle sockets destroyed on shutdown."

## User Scenarios & Testing *(mandatory)*

Users: clients with requests in flight during a deploy, and the platform (Render, docker) stopping the container.

### User Story 1 - Deploys do not cut requests off (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a slow request in flight, **When** SIGTERM arrives, **Then** the request completes normally and the process exits 0 afterwards.
2. **Given** shutdown has begun, **When** `/readyz` is requested, **Then** 503, while the in-flight request still completes.
3. **Given** an idle server with keep-alive connections open, **When** SIGTERM arrives, **Then** it exits in well under a second.

---

### User Story 2 - Shutdown never hangs (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a request that outlives `SHUTDOWN_TIMEOUT_MS`, **When** the timer fires, **Then** the process logs the outstanding request count and exits 1.
2. **Given** a second SIGTERM during shutdown, **Then** it is ignored (no second sequence).

### Edge Cases

- New connections after shutdown starts are refused (listener closed).
- A keep-alive socket must not hold the drain open for its idle timeout.
- Resources (the pool, #10) close after requests finish, never before.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: SIGTERM and SIGINT MUST start the shutdown sequence once.
- **FR-002**: Sequence: mark draining (readiness 503) → stop accepting → wait for in-flight → close resources → flush logs → exit 0.
- **FR-003**: A hard timer at `SHUTDOWN_TIMEOUT_MS` (default 10000, new validated variable) MUST log outstanding requests and exit 1.
- **FR-004**: Idle keep-alive sockets MUST be closed at shutdown; `keepAliveTimeout`/`headersTimeout` MUST exceed the proxy idle timeout.
- **FR-005**: The sequence MUST be testable without a real signal or a real exit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 in-flight requests cut off by a shutdown that finishes within the timeout.
- **SC-002**: Idle shutdown completes in < 1 s.
- **SC-003**: 100% of timed-out shutdowns exit 1 with the outstanding count logged.

## Assumptions

- **Own implementation, no library** (issue: the socket tracking is the part worth reading).
- **Pool (#10) not landed**: the sequence takes a list of resource closers; #10 adds `pool.end()`.
- **keepAliveTimeout 65 s / headersTimeout 66 s**: above the common 60 s proxy idle timeout. Render's exact proxy idle timeout was not verified here.
- **`SHUTDOWN_TIMEOUT_MS` default 10 s**, which must stay below the platform's SIGKILL grace period (#46 should confirm Render's).
- **Not verifiable here**: real `kill -TERM` (Windows has no catchable SIGTERM from `kill`; a spawn test runs on Linux/CI only) and `docker compose down` (#39 not built).
