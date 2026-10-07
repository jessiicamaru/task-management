# Data Model

`ErrorBody = { error: { code: string; message: string; details: unknown[]; requestId: string } }`.

| Class | Status | Default code |
| --- | --- | --- |
| BadRequestError | 400 | bad_request |
| UnauthorizedError | 401 | unauthorized |
| ForbiddenError | 403 | forbidden |
| NotFoundError | 404 | not_found |
| ConflictError | 409 | conflict |
| UnprocessableError | 422 | unprocessable |
| TooManyRequestsError | 429 | too_many_requests |

Mapped: ZodError → 422 `validation_failed`; pg 23505 → 409 `unique_violation`; 23503 → 409 `foreign_key_violation`; 22P02 → 400 `invalid_input`; anything else → 500 `internal_error`.
