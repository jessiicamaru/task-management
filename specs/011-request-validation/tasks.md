---

description: "Task list for request validation (issue #25)"
---

# Tasks: Request validation with zod

**Input**: Design documents from `specs/011-request-validation/`

**Tests**: Required by the acceptance criteria.

## Phase 1: Foundational

- [ ] T001 Create `server/src/utils/schemas.ts`: `strictBody`, `email`, `uuidParam`, `paginationQuery`, `sortQuery(fields)`, `isoDate`
- [ ] T002 Create `server/src/types/express.d.ts` augmenting `Request` with `validated: { query?, params? }`

## Phase 2: User Story 1 - Same rejection everywhere (Priority: P1) 🎯 MVP

- [ ] T003 [US1] Create `server/src/middlewares/validate.ts`: parse body/query/params, collect issues from all parts (paths prefixed `body.`, `query.`, `params.`), throw one `ZodError`
- [ ] T004 [US1] Update `server/src/middlewares/error-handler.ts`: details `{ path, message, code }`; `unrecognized_keys` → one detail per key
- [ ] T005 [US1] Tests: missing field, `limit=abc`, `limit=99999`, unknown key, identical bodies across three endpoints, non-UUID param

## Phase 3: User Story 2 - Parsed values (Priority: P1)

- [ ] T006 [US2] Tests: `limit=5` → 5, default 20, email trimmed + lowercased in `req.body`; unit tests for shared schemas

## Phase 4: Polish

- [ ] T007 README validation section
- [ ] T008 typecheck, lint, format, tests
