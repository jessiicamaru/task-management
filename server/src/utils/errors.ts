/**
 * Errors the application throws on purpose. The error handler turns each into its status and
 * `code`; `code` is snake_case and part of the API contract — clients switch on it, and it is
 * published in the OpenAPI document (#32). Anything that is not an AppError is a bug and answers
 * 500 with nothing from the original error.
 */
export class AppError extends Error {
  /** Thrown deliberately, as opposed to a bug. */
  readonly isOperational = true;

  constructor(
    message: string,
    readonly code: string,
    readonly statusCode: number,
    readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'bad_request', details: unknown[] = []) {
    super(message, code, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'unauthorized', details: unknown[] = []) {
    super(message, code, 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'forbidden', details: unknown[] = []) {
    super(message, code, 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', code = 'not_found', details: unknown[] = []) {
    super(message, code, 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'conflict', details: unknown[] = []) {
    super(message, code, 409, details);
  }
}

export class UnprocessableError extends AppError {
  constructor(message = 'Unprocessable entity', code = 'unprocessable', details: unknown[] = []) {
    super(message, code, 422, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', code = 'too_many_requests', details: unknown[] = []) {
    super(message, code, 429, details);
  }
}
