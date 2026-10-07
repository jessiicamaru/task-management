import type { NextFunction, Request, Response } from 'express';

import { requestIdOf } from '../utils/request-context.js';

/**
 * The project's error response shape (#7):
 *
 *   { "error": { "code": "...", "message": "...", "details": [], "requestId": "..." } }
 *
 * This is the minimal handler the app bootstrap needs; #7 extends it with AppError, zod and pg
 * error mapping and the 4xx/5xx logging rules.
 */
export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details: unknown[];
    requestId: string;
  };
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
const CLIENT_ERROR_CODES: Record<string, [code: string, message: string]> = {
  'entity.too.large': ['payload_too_large', 'Request body is too large'],
  'entity.parse.failed': ['invalid_json', 'Request body is not valid JSON'],
  'encoding.unsupported': ['unsupported_encoding', 'Request body encoding is not supported'],
  'charset.unsupported': ['unsupported_charset', 'Request body charset is not supported'],
};

interface HttpishError {
  status?: unknown;
  statusCode?: unknown;
  type?: unknown;
}

// Express recognises an error handler by its four parameters, so `_next` stays.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const { status: rawStatus, statusCode, type } = (err ?? {}) as HttpishError;
  const status = rawStatus ?? statusCode;

  if (typeof status === 'number' && Number.isInteger(status) && status >= 400 && status < 500) {
    const [code, message] = (typeof type === 'string' && CLIENT_ERROR_CODES[type]) || [
      'bad_request',
      'Bad request',
    ];
    res.status(status).json(errorBody(req, code, message));
    return;
  }

  // Nothing from the original error reaches the client; the log has the stack.
  req.log.error({ err }, 'unhandled error');
  res.status(500).json(errorBody(req, 'internal_error', 'Internal server error'));
}
