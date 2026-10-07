import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage();

/**
 * Express middleware: runs the rest of the request inside a context holding its id, so code deep
 * inside a service can log with the request's id without threading `req` through every call.
 * Must come after pino-http, which assigns `req.id`.
 */
export function requestContext(req, res, next) {
  storage.run({ requestId: req.id }, next);
}

/** The id of the request currently being handled, or undefined outside a request. */
export function getRequestId() {
  return storage.getStore()?.requestId;
}
