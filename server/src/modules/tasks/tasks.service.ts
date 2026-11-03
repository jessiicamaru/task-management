import {
  tasksRepository,
  toTaskDto,
  type TaskDto,
  type TaskFilterOptions,
  type TaskListResult,
  type TasksRepository,
  type UpdateTaskData,
} from './tasks.repository.js';
import type {
  CreateTaskInput,
  TaskStatus,
  UpdateTaskAssigneeInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from './tasks.schema.js';
import { logger } from '../../config/logger.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from '../../utils/errors.js';

export const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  todo: ['in_progress', 'done', 'archived'],
  in_progress: ['todo', 'done', 'archived'],
  done: ['in_progress', 'archived'],
  archived: ['todo'],
};

export class TasksService {
  constructor(private readonly repository: TasksRepository = tasksRepository) {}

  async createTask(userId: string, projectId: string, input: CreateTaskInput): Promise<TaskDto> {
    if (input.assigneeId) {
      const isMember = await this.repository.isProjectMember(projectId, input.assigneeId);
      if (!isMember) {
        throw new UnprocessableError(
          'Assignee is not a member of this project',
          'assignee_not_a_member',
        );
      }
    }

    const taskRow = await this.repository.createTask({
      projectId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueDate: input.dueDate,
      assigneeId: input.assigneeId,
      createdBy: userId,
    });

    return toTaskDto(taskRow);
  }

  async getTask(taskId: string, userId: string): Promise<TaskDto> {
    const task = await this.repository.getTaskByIdAndUser(taskId, userId);
    if (!task) {
      throw new NotFoundError('Task not found', 'not_found');
    }
    return toTaskDto(task);
  }

  async updateTask(taskId: string, userId: string, input: UpdateTaskInput): Promise<TaskDto> {
    const task = await this.repository.getTaskByIdAndUser(taskId, userId);
    if (!task) {
      throw new NotFoundError('Task not found', 'not_found');
    }

    if (task.callerRole === 'viewer') {
      throw new ForbiddenError('Insufficient permissions to modify task', 'forbidden');
    }

    if (input.assigneeId !== undefined && input.assigneeId !== null) {
      const isMember = await this.repository.isProjectMember(task.projectId, input.assigneeId);
      if (!isMember) {
        throw new UnprocessableError(
          'Assignee is not a member of this project',
          'assignee_not_a_member',
        );
      }
    }

    const updateData: UpdateTaskData = {
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueDate: input.dueDate,
      assigneeId: input.assigneeId,
    };

    if (input.status !== undefined) {
      if (input.status !== task.status) {
        const allowed = ALLOWED_TRANSITIONS[task.status] ?? [];
        if (!allowed.includes(input.status)) {
          throw new UnprocessableError(
            `Cannot transition task status from ${task.status} to ${input.status}`,
            'invalid_status_transition',
          );
        }

        updateData.status = input.status;
        if (input.status === 'done') {
          updateData.completedAt = new Date().toISOString();
        } else if (task.status === 'done') {
          updateData.completedAt = null;
        }

        logger.info(
          { taskId, fromStatus: task.status, toStatus: input.status, actorId: userId },
          'Task status transitioned',
        );
      }
    }

    const updatedTask = await this.repository.updateTask(taskId, updateData, task.status);
    if (!updatedTask) {
      throw new ConflictError('Task was modified concurrently', 'conflict');
    }

    return toTaskDto(updatedTask);
  }

  async updateTaskStatus(
    taskId: string,
    userId: string,
    input: UpdateTaskStatusInput,
  ): Promise<TaskDto> {
    const task = await this.repository.getTaskByIdAndUser(taskId, userId);
    if (!task) {
      throw new NotFoundError('Task not found', 'not_found');
    }

    if (task.callerRole === 'viewer') {
      throw new ForbiddenError('Insufficient permissions to modify task', 'forbidden');
    }

    // No-op transition (idempotent 200 without changing completedAt or updatedAt)
    if (input.status === task.status) {
      return toTaskDto(task);
    }

    const allowed = ALLOWED_TRANSITIONS[task.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new UnprocessableError(
        `Cannot transition task status from ${task.status} to ${input.status}`,
        'invalid_status_transition',
      );
    }

    const completedAt =
      input.status === 'done'
        ? new Date().toISOString()
        : task.status === 'done'
          ? null
          : undefined;

    logger.info(
      { taskId, fromStatus: task.status, toStatus: input.status, actorId: userId },
      'Task status transitioned',
    );

    const updatedTask = await this.repository.updateTask(
      taskId,
      { status: input.status, completedAt },
      task.status,
    );

    if (!updatedTask) {
      throw new ConflictError('Task was modified concurrently', 'conflict');
    }

    return toTaskDto(updatedTask);
  }

  async updateTaskAssignee(
    taskId: string,
    userId: string,
    input: UpdateTaskAssigneeInput,
  ): Promise<TaskDto> {
    const task = await this.repository.getTaskByIdAndUser(taskId, userId);
    if (!task) {
      throw new NotFoundError('Task not found', 'not_found');
    }

    if (task.callerRole === 'viewer') {
      throw new ForbiddenError('Insufficient permissions to modify task', 'forbidden');
    }

    if (input.assigneeId !== null) {
      const isMember = await this.repository.isProjectMember(task.projectId, input.assigneeId);
      if (!isMember) {
        throw new UnprocessableError(
          'Assignee is not a member of this project',
          'assignee_not_a_member',
        );
      }
    }

    const updatedTask = await this.repository.updateTask(taskId, {
      assigneeId: input.assigneeId,
    });

    if (!updatedTask) {
      throw new NotFoundError('Task not found', 'not_found');
    }

    return toTaskDto(updatedTask);
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    const task = await this.repository.getTaskByIdAndUser(taskId, userId);
    if (!task) {
      throw new NotFoundError('Task not found', 'not_found');
    }

    if (task.callerRole === 'viewer') {
      throw new ForbiddenError('Insufficient permissions to delete task', 'forbidden');
    }

    const deleted = await this.repository.deleteTask(taskId);
    if (!deleted) {
      throw new NotFoundError('Task not found', 'not_found');
    }
  }

  async listTasks(options: TaskFilterOptions): Promise<TaskListResult> {
    return this.repository.listTasks(options);
  }
}

export const tasksService = new TasksService();
