import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  TasksRepository,
  TaskWithUsersRow,
} from '../../src/modules/tasks/tasks.repository.js';
import { ALLOWED_TRANSITIONS, TasksService } from '../../src/modules/tasks/tasks.service.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from '../../src/utils/errors.js';

describe('TasksService - Unit Tests', () => {
  let createTaskSpy: ReturnType<typeof vi.fn>;
  let getTaskByIdAndUserSpy: ReturnType<typeof vi.fn>;
  let isProjectMemberSpy: ReturnType<typeof vi.fn>;
  let updateTaskSpy: ReturnType<typeof vi.fn>;
  let deleteTaskSpy: ReturnType<typeof vi.fn>;
  let listTasksSpy: ReturnType<typeof vi.fn>;

  let service: TasksService;

  const mockTaskRow: TaskWithUsersRow = {
    id: 'tsk_123',
    projectId: 'prj_456',
    title: 'Initial Task',
    description: 'Initial Description',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    assigneeId: null,
    createdBy: 'usr_creator',
    completedAt: null,
    createdAt: '2026-11-03T12:00:00Z',
    updatedAt: '2026-11-03T12:00:00Z',
    assigneeName: null,
    createdByName: 'Creator User',
    callerRole: 'member',
  };

  beforeEach(() => {
    createTaskSpy = vi.fn();
    getTaskByIdAndUserSpy = vi.fn();
    isProjectMemberSpy = vi.fn();
    updateTaskSpy = vi.fn();
    deleteTaskSpy = vi.fn();
    listTasksSpy = vi.fn();

    const mockRepo = {
      createTask: createTaskSpy,
      getTaskByIdAndUser: getTaskByIdAndUserSpy,
      isProjectMember: isProjectMemberSpy,
      updateTask: updateTaskSpy,
      deleteTask: deleteTaskSpy,
      listTasks: listTasksSpy,
    } as unknown as TasksRepository;

    service = new TasksService(mockRepo);
  });

  describe('createTask', () => {
    it('creates a task with defaults and returns TaskDto', async () => {
      createTaskSpy.mockResolvedValue(mockTaskRow);

      const result = await service.createTask('usr_creator', 'prj_456', {
        title: 'Initial Task',
        description: 'Initial Description',
        priority: 'medium',
      });

      expect(createTaskSpy).toHaveBeenCalledWith({
        projectId: 'prj_456',
        title: 'Initial Task',
        description: 'Initial Description',
        priority: 'medium',
        dueDate: undefined,
        assigneeId: undefined,
        createdBy: 'usr_creator',
      });
      expect(result.id).toBe('tsk_123');
      expect(result.status).toBe('todo');
      expect(result.createdBy.name).toBe('Creator User');
    });

    it('rejects with 422 assignee_not_a_member if assignee is not a project member', async () => {
      isProjectMemberSpy.mockResolvedValue(false);

      await expect(
        service.createTask('usr_creator', 'prj_456', {
          title: 'Initial Task',
          priority: 'medium',
          assigneeId: '11111111-1111-4111-8111-111111111111',
        }),
      ).rejects.toThrow(UnprocessableError);

      expect(createTaskSpy).not.toHaveBeenCalled();
    });

    it('allows assigning to a valid project member', async () => {
      isProjectMemberSpy.mockResolvedValue(true);
      createTaskSpy.mockResolvedValue({
        ...mockTaskRow,
        assigneeId: 'usr_assignee',
        assigneeName: 'Assignee User',
      });

      const result = await service.createTask('usr_creator', 'prj_456', {
        title: 'Assigned Task',
        priority: 'high',
        assigneeId: 'usr_assignee',
      });

      expect(result.assignee?.id).toBe('usr_assignee');
      expect(result.assignee?.name).toBe('Assignee User');
    });
  });

  describe('getTask', () => {
    it('returns TaskDto when found and user has access', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(mockTaskRow);

      const result = await service.getTask('tsk_123', 'usr_creator');
      expect(result.id).toBe('tsk_123');
      expect(result.title).toBe('Initial Task');
    });

    it('throws 404 not_found if task does not exist or user is not a project member', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(null);

      await expect(service.getTask('tsk_unknown', 'usr_other')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateTask', () => {
    it('throws 404 if task is not found', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(null);

      await expect(
        service.updateTask('tsk_unknown', 'usr_1', { title: 'New Title' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws 403 if caller is a viewer', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue({
        ...mockTaskRow,
        callerRole: 'viewer',
      });

      await expect(
        service.updateTask('tsk_123', 'usr_viewer', { title: 'New Title' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws 422 if updated assignee is not a member', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(mockTaskRow);
      isProjectMemberSpy.mockResolvedValue(false);

      await expect(
        service.updateTask('tsk_123', 'usr_creator', {
          assigneeId: '22222222-2222-4222-8222-222222222222',
        }),
      ).rejects.toThrow(UnprocessableError);
    });

    it('updates fields and returns updated TaskDto', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(mockTaskRow);
      updateTaskSpy.mockResolvedValue({
        ...mockTaskRow,
        title: 'Updated Title',
        dueDate: '2026-11-10T00:00:00Z',
      });

      const result = await service.updateTask('tsk_123', 'usr_creator', {
        title: 'Updated Title',
        dueDate: '2026-11-10T00:00:00Z',
      });

      expect(result.title).toBe('Updated Title');
      expect(result.dueDate).toBe('2026-11-10T00:00:00Z');
    });
  });

  describe('status transitions and rules (#30)', () => {
    it('defines the correct ALLOWED_TRANSITIONS table', () => {
      expect(ALLOWED_TRANSITIONS.todo).toEqual(['in_progress', 'done', 'archived']);
      expect(ALLOWED_TRANSITIONS.in_progress).toEqual(['todo', 'done', 'archived']);
      expect(ALLOWED_TRANSITIONS.done).toEqual(['in_progress', 'archived']);
      expect(ALLOWED_TRANSITIONS.archived).toEqual(['todo']);
    });

    it('allows valid transition todo -> in_progress', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(mockTaskRow);
      updateTaskSpy.mockResolvedValue({
        ...mockTaskRow,
        status: 'in_progress',
      });

      const result = await service.updateTaskStatus('tsk_123', 'usr_creator', {
        status: 'in_progress',
      });

      expect(result.status).toBe('in_progress');
      expect(updateTaskSpy).toHaveBeenCalledWith(
        'tsk_123',
        { status: 'in_progress', completedAt: undefined },
        'todo',
      );
    });

    it('sets completedAt when entering done', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue({
        ...mockTaskRow,
        status: 'in_progress',
      });
      updateTaskSpy.mockResolvedValue({
        ...mockTaskRow,
        status: 'done',
        completedAt: '2026-11-03T12:30:00Z',
      });

      const result = await service.updateTaskStatus('tsk_123', 'usr_creator', {
        status: 'done',
      });

      expect(result.status).toBe('done');
      expect(updateTaskSpy).toHaveBeenCalledWith(
        'tsk_123',
        expect.objectContaining({ status: 'done', completedAt: expect.any(String) }),
        'in_progress',
      );
    });

    it('clears completedAt when leaving done', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue({
        ...mockTaskRow,
        status: 'done',
        completedAt: '2026-11-03T12:00:00Z',
      });
      updateTaskSpy.mockResolvedValue({
        ...mockTaskRow,
        status: 'in_progress',
        completedAt: null,
      });

      const result = await service.updateTaskStatus('tsk_123', 'usr_creator', {
        status: 'in_progress',
      });

      expect(result.status).toBe('in_progress');
      expect(updateTaskSpy).toHaveBeenCalledWith(
        'tsk_123',
        { status: 'in_progress', completedAt: null },
        'done',
      );
    });

    it('rejects invalid transition archived -> done with 422 naming both states', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue({
        ...mockTaskRow,
        status: 'archived',
      });

      await expect(
        service.updateTaskStatus('tsk_123', 'usr_creator', { status: 'done' }),
      ).rejects.toThrow(UnprocessableError);

      expect(updateTaskSpy).not.toHaveBeenCalled();
    });

    it('handles idempotent no-op transition without updating database or completedAt', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue({
        ...mockTaskRow,
        status: 'done',
        completedAt: '2026-11-03T12:00:00Z',
      });

      const result = await service.updateTaskStatus('tsk_123', 'usr_creator', { status: 'done' });
      expect(result.status).toBe('done');
      expect(result.completedAt).toBe('2026-11-03T12:00:00Z');
      expect(updateTaskSpy).not.toHaveBeenCalled();
    });

    it('throws 409 Conflict if task was modified concurrently', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(mockTaskRow);
      updateTaskSpy.mockResolvedValue(null); // optimistic lock missed

      await expect(
        service.updateTaskStatus('tsk_123', 'usr_creator', { status: 'in_progress' }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateTaskAssignee', () => {
    it('unassigns task when assigneeId is null', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue({
        ...mockTaskRow,
        assigneeId: 'usr_old',
        assigneeName: 'Old Assignee',
      });
      updateTaskSpy.mockResolvedValue({
        ...mockTaskRow,
        assigneeId: null,
        assigneeName: null,
      });

      const result = await service.updateTaskAssignee('tsk_123', 'usr_creator', {
        assigneeId: null,
      });

      expect(result.assignee).toBeNull();
      expect(updateTaskSpy).toHaveBeenCalledWith('tsk_123', { assigneeId: null });
    });

    it('rejects if new assignee is not a project member', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(mockTaskRow);
      isProjectMemberSpy.mockResolvedValue(false);

      await expect(
        service.updateTaskAssignee('tsk_123', 'usr_creator', {
          assigneeId: '33333333-3333-4333-8333-333333333333',
        }),
      ).rejects.toThrow(UnprocessableError);
    });
  });

  describe('deleteTask', () => {
    it('deletes task successfully for member', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(mockTaskRow);
      deleteTaskSpy.mockResolvedValue(true);

      await service.deleteTask('tsk_123', 'usr_creator');
      expect(deleteTaskSpy).toHaveBeenCalledWith('tsk_123');
    });

    it('throws 403 for viewer attempting to delete', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue({
        ...mockTaskRow,
        callerRole: 'viewer',
      });

      await expect(service.deleteTask('tsk_123', 'usr_viewer')).rejects.toThrow(ForbiddenError);
      expect(deleteTaskSpy).not.toHaveBeenCalled();
    });

    it('throws 404 for non-existent task', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(null);

      await expect(service.deleteTask('tsk_missing', 'usr_creator')).rejects.toThrow(NotFoundError);
    });
  });
});
