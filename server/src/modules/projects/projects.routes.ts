import { Router } from 'express';

import { projectsController, type ProjectsController } from './projects.controller.js';
import {
  addMemberSchema,
  createProjectSchema,
  projectIdParamSchema,
  projectMemberParamSchema,
  transferOwnershipSchema,
  updateMemberRoleSchema,
  updateProjectSchema,
} from './projects.schema.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { requireProjectRole } from '../../middlewares/project-guard.js';
import { validate } from '../../middlewares/validate.js';
import { paginationQuery } from '../../utils/schemas.js';
import { tasksController } from '../tasks/tasks.controller.js';
import { createTaskSchema, taskListQuerySchema } from '../tasks/tasks.schema.js';

export function createProjectsRouter({
  controller = projectsController,
}: { controller?: ProjectsController } = {}): Router {
  const router = Router();

  // All project routes require authentication
  router.use(authenticate);

  // POST /api/v1/projects
  router.post('/', validate({ body: createProjectSchema }), controller.create);

  // GET /api/v1/projects
  router.get('/', validate({ query: paginationQuery }), controller.list);

  // GET /api/v1/projects/:id
  router.get(
    '/:id',
    validate({ params: projectIdParamSchema }),
    requireProjectRole('owner', 'admin', 'member', 'viewer'),
    controller.get,
  );

  // PATCH /api/v1/projects/:id
  router.patch(
    '/:id',
    validate({ params: projectIdParamSchema, body: updateProjectSchema }),
    requireProjectRole('owner', 'admin'),
    controller.update,
  );

  // DELETE /api/v1/projects/:id
  router.delete(
    '/:id',
    validate({ params: projectIdParamSchema }),
    requireProjectRole('owner'),
    controller.delete,
  );

  // GET /api/v1/projects/:id/members
  router.get(
    '/:id/members',
    validate({ params: projectIdParamSchema }),
    requireProjectRole('owner', 'admin', 'member', 'viewer'),
    controller.listMembers,
  );

  // POST /api/v1/projects/:id/members
  router.post(
    '/:id/members',
    validate({ params: projectIdParamSchema, body: addMemberSchema }),
    requireProjectRole('owner', 'admin'),
    controller.addMember,
  );

  // DELETE /api/v1/projects/:id/members/me
  router.delete(
    '/:id/members/me',
    validate({ params: projectIdParamSchema }),
    requireProjectRole('owner', 'admin', 'member', 'viewer'),
    controller.leave,
  );

  // PATCH /api/v1/projects/:id/members/:userId
  router.patch(
    '/:id/members/:userId',
    validate({ params: projectMemberParamSchema, body: updateMemberRoleSchema }),
    requireProjectRole('owner', 'admin'),
    controller.updateMemberRole,
  );

  // DELETE /api/v1/projects/:id/members/:userId
  router.delete(
    '/:id/members/:userId',
    validate({ params: projectMemberParamSchema }),
    requireProjectRole('owner', 'admin', 'member', 'viewer'),
    controller.removeMember,
  );

  // POST /api/v1/projects/:id/transfer-ownership
  router.post(
    '/:id/transfer-ownership',
    validate({ params: projectIdParamSchema, body: transferOwnershipSchema }),
    requireProjectRole('owner'),
    controller.transferOwnership,
  );

  // POST /api/v1/projects/:id/tasks
  router.post(
    '/:id/tasks',
    validate({ params: projectIdParamSchema, body: createTaskSchema }),
    requireProjectRole('owner', 'admin', 'member'),
    tasksController.create,
  );

  // GET /api/v1/projects/:id/tasks
  router.get(
    '/:id/tasks',
    validate({ params: projectIdParamSchema, query: taskListQuerySchema }),
    requireProjectRole('owner', 'admin', 'member', 'viewer'),
    tasksController.list,
  );

  return router;
}
