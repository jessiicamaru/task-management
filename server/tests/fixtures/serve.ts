// Spawned by tests/integration/shutdown.test.ts to receive a real SIGTERM: starts the real server
// on an ephemeral port with a slow route, logging at info to stdout.
import { Router } from 'express';

import { start } from '../../src/start.js';

const apiRouter = Router();
apiRouter.get('/slow', (_req, res) => {
  setTimeout(() => res.json({ done: true }), 1000);
});

start({ port: 0, apiRouter, checkDatabase: () => Promise.resolve() });
