import type { NextFunction, Request, Response } from 'express';

import type {
  CreateTaskInput,
  TaskListQueryInput,
  UpdateTaskAssigneeInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from './tasks.schema.js';
import { tasksService, type TasksService } from './tasks.service.js';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] ?? '';
  return param ?? '';
}

export class TasksController {
  constructor(private readonly service: TasksService = tasksService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const projectId = getParam(req.params.projectId) || getParam(req.params.id);
      const input = req.body as CreateTaskInput;
      const task = await this.service.createTask(userId, projectId, input);

      res.setHeader('Location', `/api/v1/tasks/${task.id}`);
      res.status(201).json({ task });
    } catch (err) {
      next(err);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const projectId = getParam(req.params.projectId) || getParam(req.params.id);
      const query = (req.validated?.query ?? {}) as TaskListQueryInput;

      const result = await this.service.listTasks({
        projectId,
        userId,
        status: query.status,
        priority: query.priority,
        assigneeId: query.assigneeId,
        dueBefore: query.dueBefore,
        dueAfter: query.dueAfter,
        q: query.q,
        sort: query.sort ?? '-createdAt',
        limit: query.limit ?? 20,
        cursor: query.cursor,
        includeTotal: query.includeTotal,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const taskId = getParam(req.params.id);
      const task = await this.service.getTask(taskId, userId);
      res.status(200).json({ task });
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const taskId = getParam(req.params.id);
      const input = req.body as UpdateTaskInput;
      const task = await this.service.updateTask(taskId, userId, input);
      res.status(200).json({ task });
    } catch (err) {
      next(err);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const taskId = getParam(req.params.id);
      const input = req.body as UpdateTaskStatusInput;
      const task = await this.service.updateTaskStatus(taskId, userId, input);
      res.status(200).json({ task });
    } catch (err) {
      next(err);
    }
  };

  updateAssignee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const taskId = getParam(req.params.id);
      const input = req.body as UpdateTaskAssigneeInput;
      const task = await this.service.updateTaskAssignee(taskId, userId, input);
      res.status(200).json({ task });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const taskId = getParam(req.params.id);
      await this.service.deleteTask(taskId, userId);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}

export const tasksController = new TasksController();
