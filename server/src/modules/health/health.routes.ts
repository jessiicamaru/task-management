import { Router } from 'express';

import { healthController, type HealthControllerDeps } from './health.controller.js';

/** /healthz (liveness) and /readyz (readiness), mounted at the root by createApp. */
export function createHealthRouter(deps: HealthControllerDeps): Router {
  const controller = healthController(deps);
  const router = Router();

  router.get('/healthz', controller.live);
  router.get('/readyz', controller.ready);

  return router;
}
