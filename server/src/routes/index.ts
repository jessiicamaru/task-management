import { Router } from 'express';

import { createAuthRouter } from '../modules/auth/auth.routes.js';

/**
 * Builds the `/api/v1` router. Adding a module is one line here:
 *
 *   router.use('/tasks', tasksRouter());
 */
export function createApiRouter() {
  const router = Router();

  router.use('/auth', createAuthRouter());

  return router;
}
