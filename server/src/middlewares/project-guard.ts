import type { NextFunction, Request, Response } from 'express';

import { query } from '../db/pool.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors.js';

export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';

export function requireProjectRole(...allowedRoles: ProjectRole[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      return next(new UnauthorizedError('Authentication required', 'unauthorized'));
    }

    const projectId = req.params.projectId || req.params.id;
    if (!projectId) {
      return next(new NotFoundError('Project not found', 'not_found'));
    }

    try {
      const result = await query<{ role: ProjectRole }>(
        `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
        [projectId, userId],
      );

      const membership = result.rows[0];
      // Anti-enumeration: non-members receive 404 exactly like non-existent projects
      if (!membership) {
        return next(new NotFoundError('Project not found', 'not_found'));
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        return next(new ForbiddenError('Insufficient project permissions', 'forbidden'));
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
