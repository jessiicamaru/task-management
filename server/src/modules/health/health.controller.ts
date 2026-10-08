import type { Request, Response } from 'express';

import { liveness, readiness, type DatabaseCheck } from './health.service.js';

export interface HealthControllerDeps {
  version: string;
  checkDatabase: DatabaseCheck;
  timeoutMs: number;
  /** True once shutdown has begun: readiness answers 503 so no new traffic arrives. */
  isDraining: () => boolean;
}

export function healthController({
  version,
  checkDatabase,
  timeoutMs,
  isDraining,
}: HealthControllerDeps) {
  return {
    live: (_req: Request, res: Response): void => {
      res.status(200).json(liveness(version));
    },

    ready: async (_req: Request, res: Response): Promise<void> => {
      if (isDraining()) {
        res.status(503).json({ status: 'not_ready', checks: { shutdown: 'draining' } });
        return;
      }
      const result = await readiness(checkDatabase, timeoutMs);
      // A failing dependency is a 503 — never a 500, never a 200 with a sad body.
      res.status(result.status === 'ready' ? 200 : 503).json(result);
    },
  };
}
