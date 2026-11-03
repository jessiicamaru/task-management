import { Router } from 'express';

import { tasksController, type TasksController } from './tasks.controller.js';
import {
  taskIdParamSchema,
  updateTaskAssigneeSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from './tasks.schema.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';

export interface CreateTasksRouterOptions {
  controller?: TasksController | undefined;
}

export function createTasksRouter({
  controller = tasksController,
}: CreateTasksRouterOptions = {}): Router {
  const router = Router();

  // All task endpoints require authentication
  router.use(authenticate);

  // GET /api/v1/tasks/:id
  router.get('/:id', validate({ params: taskIdParamSchema }), controller.get);

  // PATCH /api/v1/tasks/:id
  router.patch(
    '/:id',
    validate({ params: taskIdParamSchema, body: updateTaskSchema }),
    controller.update,
  );

  // PATCH /api/v1/tasks/:id/status
  router.patch(
    '/:id/status',
    validate({ params: taskIdParamSchema, body: updateTaskStatusSchema }),
    controller.updateStatus,
  );

  // PATCH /api/v1/tasks/:id/assignee
  router.patch(
    '/:id/assignee',
    validate({ params: taskIdParamSchema, body: updateTaskAssigneeSchema }),
    controller.updateAssignee,
  );

  // DELETE /api/v1/tasks/:id
  router.delete('/:id', validate({ params: taskIdParamSchema }), controller.delete);

  return router;
}
