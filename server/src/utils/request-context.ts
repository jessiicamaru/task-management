import { AsyncLocalStorage } from 'node:async_hooks';

import type { NextFunction, Request, Response } from 'express';

interface RequestStore {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestStore>();

/**
 * Express middleware: runs the rest of the request inside a context holding its id, so code deep
 * inside a service can log with the request's id without threading `req` through every call.
 * Must come after pino-http, which assigns `req.id`.
 */
export function requestContext(req: Request, _res: Response, next: NextFunction): void {
  storage.run({ requestId: requestIdOf(req) }, next);
}

/**
 * The id pino-http assigned to a request. Its type allows objects, but genReqId (request-logger)
 * only ever returns strings.
 */
export function requestIdOf(req: Request): string {
  return typeof req.id === 'string' || typeof req.id === 'number' ? String(req.id) : '';
}

/** The id of the request currently being handled, or undefined outside a request. */
export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}
