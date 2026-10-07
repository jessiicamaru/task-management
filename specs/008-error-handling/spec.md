# Feature Specification: Centralised error handling and one error shape

**Feature Branch**: `008-error-handling`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Implement GitHub issue #7 (https://github.com/jessiicamaru/task-management/issues/7): feat(api): centralized error handling and a single error response shape — AppError + BadRequest/Unauthorized/Forbidden/NotFound/Conflict/Unprocessable/TooManyRequests (isOperational); error handler mapping AppError, ZodError → 422 with details, pg 23505/23503 → 409 and 22P02 → 400, anything else → 500 internal_error with nothing from the original; shape { error: { code, message, details, requestId } }; 5xx logged at error with stack, 4xx at warn without; async-handler (or a verified note that Express 5 makes it unnecessary); JSON 404; unhandledRejection / uncaughtException log fatally and exit non-zero."

## User Scenarios & Testing *(mandatory)*

Users: API clients (the web app switches on `code`), operators reading logs, contributors throwing errors.

### User Story 1 - Every error has one predictable shape (Priority: P1)

A client receives `{ error: { code, message, details, requestId } }` for every failure, with a
status that matches the cause, and can switch on `code`.

**Independent Test**: A handler throwing `new NotFoundError('Task not found', 'task_not_found')` → 404 in the shape.

**Acceptance Scenarios**:

1. **Given** a thrown `NotFoundError('Task not found', 'task_not_found')`, **Then** 404 with that code and message.
2. **Given** a `ZodError`, **Then** 422 `validation_failed` with `details: [{ path, message }]`.
3. **Given** a pg unique violation (`23505`) or foreign-key violation (`23503`), **Then** 409; invalid text representation (`22P02`) → 400.
4. **Given** an unmatched route, **Then** JSON 404 with `requestId`.

---

### User Story 2 - Failures never leak and never hang (Priority: P1)

**Acceptance Scenarios**:

1. **Given** an unexpected error, **When** answered, **Then** 500 `internal_error` with no stack, SQL or file path in the body.
2. **Given** an async handler whose promise rejects, **Then** 500 is returned and the stack is logged — the request does not hang.
3. **Given** an unhandled rejection or uncaught exception outside a request, **Then** the process logs fatally and exits non-zero.

---

### User Story 3 - Logs separate real failures from client mistakes (Priority: P2)

**Acceptance Scenarios**:

1. **Given** a 5xx, **Then** it is logged at `error` with the stack.
2. **Given** a 4xx, **Then** it is logged at `warn` with code and message, no stack.

### Edge Cases

- A thrown non-Error value (string, object) → 500, no crash in the handler.
- An `AppError` subclass thrown with a 5xx status → logged as a 5xx and its message not exposed.
- Headers already sent → delegate to Express's default handler (closes the connection).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `AppError` with `statusCode`, `code`, optional `details`, `isOperational = true`, and the seven subclasses in issue #7.
- **FR-002**: The error handler MUST map AppError, ZodError, pg `23505`/`23503`/`22P02`, body-parser 4xx, and everything else as listed.
- **FR-003**: All error responses use the shape `{ error: { code, message, details, requestId } }`; `code` is snake_case.
- **FR-004**: 5xx → log `error` with stack; 4xx → log `warn` without stack.
- **FR-005**: A rejected handler promise MUST reach the error handler.
- **FR-006**: Process-level unhandled rejections and uncaught exceptions MUST be logged fatally and exit non-zero.
- **FR-007**: 500 bodies MUST NOT include anything from the original error in any environment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of error responses match the shape.
- **SC-002**: 0 requests hang on a rejected handler promise.
- **SC-003**: 0 stacks, SQL fragments or file paths in 500 bodies.

## Assumptions

- **No `details` on a 500, even in development**: the stack is in the (pretty) dev log; a body field that exists only in one environment is a field that can leak.
- **snake_case** codes, as already used by #6 (`not_found`, `payload_too_large`).
- **No `asyncHandler` wrapper**: Express 5 (installed: 5.2) forwards a rejected handler promise to `next(err)`; this is pinned by a test, so an Express change that breaks it fails CI. A floating promise that is never returned is caught by lint (`no-floating-promises`, #75), not by a wrapper.
- pg is not wired yet (M2); mapping keys off the error's `code` property, tested with pg-shaped errors.
