import express from 'express';

import { logger as defaultLogger } from './config/logger.js';
import { requestLogger } from './middlewares/request-logger.js';
import { requestContext } from './utils/request-context.js';

/**
 * Builds the Express application. Kept separate from the listener in server.js so tests can
 * exercise it with Supertest without opening a port, and inject a logger to capture output.
 */
export function createApp({ logger = defaultLogger } = {}) {
  const app = express();

  app.use(requestLogger(logger));
  app.use(requestContext);

  // Temporary liveness signal for the scaffold; superseded by /healthz and /readyz (#8).
  app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  return app;
}
