import { Router } from 'express';

/**
 * Builds the `/api/v1` router. Adding a module is one line here:
 *
 *   router.use('/tasks', tasksRouter());
 *
 * Module routers arrive with their issues (auth M3, projects M4, tasks M5).
 */
export function createApiRouter() {
  const router = Router();

  return router;
}
