# Feature Specification: Request validation with zod

**Feature Branch**: `011-request-validation`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Implement GitHub issue #25 (https://github.com/jessiicamaru/task-management/issues/25): feat(api): zod request validation middleware — validate({ body, query, params }); parsed result replaces raw input (req.query is a getter in Express 5: verify, else req.validated.query); ZodError thrown to the #7 handler → 422 with details [{ path, message, code }]; shared schemas uuidParam, paginationQuery (limit 1–100 default 20, cursor), sortQuery, isoDate; .strict() bodies; schemas live next to their module and are exported for OpenAPI (#32)."

## User Scenarios & Testing *(mandatory)*

Users: API clients (consistent, actionable 422s) and contributors writing handlers (inputs already parsed).

### User Story 1 - Bad input is rejected the same way everywhere (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a body missing a required field, **Then** 422 with `details` naming the field path.
2. **Given** `?limit=abc` or `?limit=99999`, **Then** 422.
3. **Given** an unknown body key (`priorty`), **Then** 422 with the key named in `details`.
4. **Given** the same malformed input on three endpoints, **Then** the error bodies are identical apart from `requestId`.

---

### User Story 2 - Handlers see parsed values (Priority: P1)

**Acceptance Scenarios**:

1. **Given** `?limit=5`, **Then** the handler sees the number 5; with no `limit`, 20.
2. **Given** `"  Ada@Example.COM "` in `email`, **Then** the handler reads `ada@example.com` from `req.body`.

### Edge Cases

- Express 5's `req.query` cannot be reassigned (throws in strict mode): parsed query lives on `req.validated.query`.
- A non-UUID `:id` → 422 before any query would run.
- `limit` uncapped would be a memory-exhaustion vector: capped at 100.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `validate({ body?, query?, params? })` MUST parse each present part and throw `ZodError` to the error handler on failure (all parts reported together).
- **FR-002**: Parsed body replaces `req.body`; parsed query and params are available on `req.validated`.
- **FR-003**: 422 details MUST be `{ path, message, code }`; an unknown key yields one detail per key with `path` = the key.
- **FR-004**: Shared schemas: `uuidParam`, `paginationQuery` (limit int 1–100 default 20, optional cursor), `sortQuery(fields)`, `isoDate`, `email` (trimmed, lowercased).
- **FR-005**: Body schemas are strict (unknown keys rejected), via a `strictBody` helper.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of malformed-input cases answer 422 in the shared shape.
- **SC-002**: 0 handlers read raw strings where a parsed value exists.

## Assumptions

- **Reject unknown keys** (`.strict()`), consistently. Forward compatibility is handled by versioning (`/api/v2`), not by silently dropping fields.
- **No response validation** in this change (test-only if ever added).
- **`limit` capped at 100.**
- No module endpoints exist yet (auth M3, tasks M5); shared schemas and the middleware are exercised through test routes. Module schemas are added beside their module by those issues.
