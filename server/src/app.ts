import compression from 'compression';
import cors from 'cors';
import express, { type Express, type Router } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';

import type { Config } from './config/env.js';
import { config as defaultConfig } from './config/index.js';
import { logger as defaultLogger } from './config/logger.js';
import { appVersion } from './config/version.js';
import { createLifecycle, type Lifecycle } from './lifecycle.js';
import { errorHandler, notFound } from './middlewares/error-handler.js';
import { requestLogger } from './middlewares/request-logger.js';
import { pingDatabase } from './modules/health/health.repository.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import type { DatabaseCheck } from './modules/health/health.service.js';
import { createApiRouter } from './routes/index.js';
import { requestContext } from './utils/request-context.js';

// 100 KB holds a task with a long description many times over. An unbounded body parser on a
// 512 MB Render instance is a one-request outage — raise this only with a concrete payload in hand.
const BODY_LIMIT = '100kb';

/**
 * Builds the Express application. A factory, not a singleton: tests build one app per suite, and
 * nothing here opens a connection or a port. The order of the chain below is load-bearing.
 */
export interface CreateAppOptions {
  logger?: Logger;
  config?: Config;
  /** The router mounted at /api/v1. Tests pass their own to exercise the real chain. */
  apiRouter?: Router;
  /** The readiness probe's database round trip. Defaults to a one-shot client until #10's pool. */
  checkDatabase?: DatabaseCheck;
  /** Draining flag and in-flight counter, shared with the shutdown sequence (start.ts). */
  lifecycle?: Lifecycle;
}

// Readiness answers within this, whatever the database does.
const READINESS_TIMEOUT_MS = 2000;

export function createApp({
  logger = defaultLogger,
  config = defaultConfig,
  apiRouter = createApiRouter(),
  checkDatabase,
  lifecycle = createLifecycle(),
}: CreateAppOptions = {}): Express {
  const { corsOrigins } = config.http;
  if (corsOrigins.includes('*')) {
    // Config validation already refuses this; a hand-built config in a test must not bypass it.
    throw new Error('CORS origins must be explicit: * is invalid with credentials');
  }

  const app = express();
  app.disable('x-powered-by');

  // 1. Render terminates TLS at one proxy hop. Without this, req.ip is the proxy and the rate
  //    limiter (#24) buckets the whole internet together. `true` would trust any X-Forwarded-For
  //    and let a caller forge their IP.
  app.set('trust proxy', 1);

  // 2. Count every request before anything can reject it, so a graceful shutdown waits for it.
  app.use(lifecycle.track);

  //    Logging next, so even a request rejected by a later middleware is logged with an id.
  app.use(requestLogger(logger));
  app.use(requestContext);
  // Filled by validate() (src/middlewares/validate.ts); present on every request so the type holds.
  app.use((req, _res, next) => {
    req.validated = {};
    next();
  });

  // 3. Security headers on every response, errors included. The CSP allows what the Swagger UI
  //    (#32) needs: its own script files, inline styles, data-URI images. COEP off: the UI loads
  //    cross-origin resources that do not send CORP headers.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 4. CORS before any route, so preflights are answered. A disallowed origin gets no CORS headers
  //    at all and the browser blocks the response. (Passing the list straight to cors() would
  //    still send allow-credentials to a disallowed origin.)
  const allowed = new Set(corsOrigins);
  app.use(
    cors((req, callback) => {
      callback(
        null,
        req.headers.origin !== undefined && allowed.has(req.headers.origin)
          ? { origin: true, credentials: true }
          : { origin: false },
      );
    }),
  );

  // 5. Compression before anything writes a body.
  app.use(compression());

  // 6. Body parsing before the routes that read req.body, bounded.
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: BODY_LIMIT }));

  // 7. Health probes: before authentication and rate limiting, so a probe never needs a token and
  //    never consumes a client's quota.
  app.use(
    createHealthRouter({
      version: appVersion(config.build.gitSha),
      timeoutMs: READINESS_TIMEOUT_MS,
      isDraining: () => lifecycle.draining,
      checkDatabase:
        checkDatabase ??
        (() =>
          pingDatabase({
            url: config.db.url,
            ssl: config.db.ssl,
            timeoutMs: READINESS_TIMEOUT_MS,
          })),
    }),
  );

  // 8. The versioned API.
  app.use('/api/v1', apiRouter);

  // 9. Unmatched routes, then the error handler — last, always.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
