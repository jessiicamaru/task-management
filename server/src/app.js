import express from 'express';

/**
 * Builds the Express application. Kept separate from the listener in server.js so tests can
 * exercise it with Supertest without opening a port.
 */
export function createApp() {
  const app = express();

  // Temporary liveness signal for the scaffold; superseded by /healthz and /readyz (#8).
  app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  return app;
}
