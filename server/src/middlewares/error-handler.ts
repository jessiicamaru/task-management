import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../utils/errors.js';
import { requestIdOf } from '../utils/request-context.js';

/**
 * The project's error response shape, used by every endpoint:
 *
 *   { "error": { "code": "task_not_found", "message": "Task not found", "details": [],
 *                "requestId": "0d6f…" } }
 *
 * `requestId` is what turns a user's screenshot into a log search.
 *
 * There is no asyncHandler wrapper: Express 5 passes a rejected handler promise to the error
 * handler itself (pinned by tests/integration/errors.test.ts), and a promise that is never returned
 * is a lint error (@typescript-eslint/no-floating-promises).
 */
export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details: unknown[];
    requestId: string;
  };
}

interface HttpError {
  status: number;
  code: string;
  message: string;
  details: unknown[];
}

export function errorBody(
  req: Request,
  code: string,
  message: string,
  details: unknown[] = [],
): ErrorBody {
  return { error: { code, message, details, requestId: requestIdOf(req) } };
}

/** Unmatched routes answer in the error shape, not Express's HTML default. */
export function notFound(req: Request, res: Response): void {
  res.status(404).json(errorBody(req, 'not_found', `Route ${req.method} ${req.path} not found`));
}

// body-parser errors carry a 4xx `status` and a `type`; map the ones a client can cause.
const BODY_PARSER_ERRORS: Record<string, [code: string, message: string]> = {
  'entity.too.large': ['payload_too_large', 'Request body is too large'],
  'entity.parse.failed': ['invalid_json', 'Request body is not valid JSON'],
  'encoding.unsupported': ['unsupported_encoding', 'Request body encoding is not supported'],
  'charset.unsupported': ['unsupported_charset', 'Request body charset is not supported'],
};

// PostgreSQL SQLSTATE codes a client can cause. Messages are generic on purpose: pg's own
// messages name tables, columns and constraints.
const PG_ERRORS: Record<string, HttpError> = {
  '23505': {
    status: 409,
    code: 'unique_violation',
    message: 'Resource already exists',
    details: [],
  },
  '23503': {
    status: 409,
    code: 'foreign_key_violation',
    message: 'Referenced resource does not exist or is still in use',
    details: [],
  },
  '22P02': { status: 400, code: 'invalid_input', message: 'Invalid input syntax', details: [] },
};

const INTERNAL: HttpError = {
  status: 500,
  code: 'internal_error',
  message: 'Internal server error',
  details: [],
};

interface ErrorLike {
  status?: unknown;
  statusCode?: unknown;
  type?: unknown;
  code?: unknown;
}

/** Maps anything thrown to the status, code and client-safe message it answers with. */
export function toHttpError(err: unknown): HttpError {
  if (err instanceof AppError) {
    // A 5xx AppError is still a server failure: its message is not for the client.
    if (err.statusCode >= 500) return INTERNAL;
    return { status: err.statusCode, code: err.code, message: err.message, details: err.details };
  }

  if (err instanceof ZodError) {
    return {
      status: 422,
      code: 'validation_failed',
      message: 'Request validation failed',
      details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    };
  }

  if (typeof err !== 'object' || err === null) return INTERNAL;
  const { status: rawStatus, statusCode, type, code } = err as ErrorLike;

  if (typeof code === 'string' && PG_ERRORS[code]) return PG_ERRORS[code];

  const status = rawStatus ?? statusCode;
  if (typeof status === 'number' && Number.isInteger(status) && status >= 400 && status < 500) {
    const [mappedCode, message] = (typeof type === 'string' && BODY_PARSER_ERRORS[type]) || [
      'bad_request',
      'Bad request',
    ];
    return { status, code: mappedCode, message, details: [] };
  }

  return INTERNAL;
}

// Express recognises an error handler by its four parameters.
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  // Once headers are out, the only safe move is Express's default: close the connection.
  if (res.headersSent) {
    next(err);
    return;
  }

  const httpError = toHttpError(err);

  if (httpError.status >= 500) {
    // The stack belongs in the log, never in the body.
    req.log.error({ err }, 'request failed');
  } else {
    // A wall of stack traces for 404s makes the real errors invisible.
    req.log.warn({ code: httpError.code, status: httpError.status }, httpError.message);
  }

  res
    .status(httpError.status)
    .json(errorBody(req, httpError.code, httpError.message, httpError.details));
}
