import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { config as defaultConfig } from './config/index.js';
import { logger as defaultLogger } from './config/logger.js';
import { errorHandler, notFound } from './middlewares/error-handler.js';
import { requestLogger } from './middlewares/request-logger.js';
import { createApiRouter } from './routes/index.js';
import { requestContext } from './utils/request-context.js';

// 100 KB holds a task with a long description many times over. An unbounded body parser on a
// 512 MB Render instance is a one-request outage — raise this only with a concrete payload in hand.
const BODY_LIMIT = '100kb';

/**
 * Builds the Express application. A factory, not a singleton: tests build one app per suite, and
 * nothing here opens a connection or a port. The order of the chain below is load-bearing.
 */
export function createApp({ logger = defaultLogger, config = defaultConfig } = {}) {
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

  // 2. Logging first, so even a request rejected by a later middleware is logged with an id.
  app.use(requestLogger(logger));
  app.use(requestContext);

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
        allowed.has(req.headers.origin) ? { origin: true, credentials: true } : { origin: false },
      );
    }),
  );

  // 5. Compression before anything writes a body.
  app.use(compression());

  // 6. Body parsing before the routes that read req.body, bounded.
  app.use(express.json({ limit: BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: BODY_LIMIT }));

  // 7. Health routes (#8) mount here: before authentication and rate limiting, so a probe never
  //    needs a token and never consumes a client's quota.
  // Temporary liveness signal for the scaffold; superseded by /healthz and /readyz (#8).
  app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // 8. The versioned API.
  app.use('/api/v1', createApiRouter());

  // 9. Unmatched routes, then the error handler — last, always.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
