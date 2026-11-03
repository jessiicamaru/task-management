import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { buildConfig } from '../../src/config/env.js';
import { createLogger } from '../../src/config/logger.js';
import * as poolModule from '../../src/db/pool.js';
import { signAccessToken } from '../../src/modules/auth/tokens.js';
import { createProjectsRouter } from '../../src/modules/projects/projects.routes.js';
import { TasksController } from '../../src/modules/tasks/tasks.controller.js';
import type {
  TasksRepository,
  TaskWithUsersRow,
} from '../../src/modules/tasks/tasks.repository.js';
import { createTasksRouter } from '../../src/modules/tasks/tasks.routes.js';
import { TasksService } from '../../src/modules/tasks/tasks.service.js';
import { validEnv } from '../helpers/env.js';

const config = buildConfig(
  validEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://u:p@localhost/app',
    JWT_SECRET: 'test-secret-at-least-32-chars-long!',
    CORS_ORIGINS: 'https://app.example.com',
  }),
);
const logger = createLogger({ level: 'silent' });

describe('Tasks API Integration Tests (#28, #29, #30)', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const otherUserId = '22222222-2222-4222-8222-222222222222';
  const projectId = '33333333-3333-4333-8333-333333333333';
  const taskId = '44444444-4444-4444-8444-444444444444';

  let token: string;
  let app: ReturnType<typeof createApp>;

  let createTaskSpy: ReturnType<typeof vi.fn>;
  let getTaskByIdAndUserSpy: ReturnType<typeof vi.fn>;
  let isProjectMemberSpy: ReturnType<typeof vi.fn>;
  let updateTaskSpy: ReturnType<typeof vi.fn>;
  let deleteTaskSpy: ReturnType<typeof vi.fn>;
  let listTasksSpy: ReturnType<typeof vi.fn>;

  const sampleTaskRow: TaskWithUsersRow = {
    id: taskId,
    projectId,
    title: 'Integration Test Task',
    description: 'Detailed description',
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    assigneeId: null,
    createdBy: userId,
    completedAt: null,
    createdAt: '2026-11-03T12:00:00.000Z',
    updatedAt: '2026-11-03T12:00:00.000Z',
    assigneeName: null,
    createdByName: 'Test Author',
    callerRole: 'member',
  };

  beforeEach(async () => {
    vi.restoreAllMocks();
    token = signAccessToken(userId, { secret: config.jwt.secret }).token;

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

    const service = new TasksService(mockRepo);
    const controller = new TasksController(service);

    const express = (await import('express')).default;
    const apiRouter = express.Router();
    apiRouter.use('/projects', createProjectsRouter());
    apiRouter.use('/tasks', createTasksRouter({ controller }));

    app = createApp({ config, logger, apiRouter });
  });

  describe('POST /api/v1/projects/:id/tasks', () => {
    it('returns 201 with created task and Location header', async () => {
      // Mock project guard: caller is member
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      // Mock pool.query for createTask insert and select
      vi.spyOn(poolModule, 'query')
        .mockResolvedValueOnce({
          rows: [{ id: taskId }],
          rowCount: 1,
          command: '',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [sampleTaskRow],
          rowCount: 1,
          command: '',
          oid: 0,
          fields: [],
        });

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Integration Test Task',
          description: 'Detailed description',
          priority: 'medium',
        });

      expect(res.status).toBe(201);
      expect(res.headers.location).toBe(`/api/v1/tasks/${taskId}`);
      expect(res.body.task.id).toBe(taskId);
      expect(res.body.task.status).toBe('todo');
    });

    it('returns 403 if caller has viewer role on project', async () => {
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [{ role: 'viewer' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Forbidden Task' });

      expect(res.status).toBe(403);
    });

    it('returns 404 anti-enumeration if caller is not in project_members', async () => {
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: [],
      });

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Secret Task' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('not_found');
    });

    it('returns 422 if body contains disallowed keys (strict schema)', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/tasks`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Task With Smuggled Field',
          createdBy: otherUserId,
          projectId: otherUserId,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('validation_failed');
    });
  });

  describe('GET /api/v1/projects/:id/tasks (#29)', () => {
    it('returns 200 with list of tasks and pagination envelope', async () => {
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [{ role: 'viewer' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [sampleTaskRow],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/tasks?limit=20`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.limit).toBe(20);
      expect(res.body.pagination.hasMore).toBe(false);
    });

    it('returns 422 if limit exceeds 100', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/tasks?limit=101`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('validation_failed');
    });
  });

  describe('GET /api/v1/tasks/:id (#28)', () => {
    it('returns 200 with TaskDto for authorized member', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(sampleTaskRow);

      const res = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.task.id).toBe(taskId);
      expect(res.body.task.title).toBe('Integration Test Task');
    });

    it('returns 404 anti-enumeration for task in inaccessible project', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('not_found');
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('returns 200 and partially updates fields', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(sampleTaskRow);
      updateTaskSpy.mockResolvedValue({
        ...sampleTaskRow,
        title: 'Updated Title',
        dueDate: '2026-11-15T10:00:00.000Z',
      });

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title', dueDate: '2026-11-15T10:00:00.000Z' });

      expect(res.status).toBe(200);
      expect(res.body.task.title).toBe('Updated Title');
      expect(res.body.task.dueDate).toBe('2026-11-15T10:00:00.000Z');
    });

    it('returns 403 if caller is a viewer', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue({
        ...sampleTaskRow,
        callerRole: 'viewer',
      });

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Viewer Edit' });

      expect(res.status).toBe(403);
    });

    it('returns 422 if body contains completedAt (strict schema)', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ completedAt: new Date().toISOString() });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('validation_failed');
    });
  });

  describe('PATCH /api/v1/tasks/:id/status (#30)', () => {
    it('transitions todo -> in_progress successfully', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(sampleTaskRow);
      updateTaskSpy.mockResolvedValue({
        ...sampleTaskRow,
        status: 'in_progress',
      });

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.task.status).toBe('in_progress');
    });

    it('returns 422 invalid_status_transition on disallowed transition archived -> done', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue({
        ...sampleTaskRow,
        status: 'archived',
      });

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'done' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('invalid_status_transition');
    });

    it('returns 200 on idempotent no-op transition', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue({
        ...sampleTaskRow,
        status: 'done',
        completedAt: '2026-11-03T12:00:00.000Z',
      });

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'done' });

      expect(res.status).toBe(200);
      expect(res.body.task.status).toBe('done');
      expect(res.body.task.completedAt).toBe('2026-11-03T12:00:00.000Z');
    });
  });

  describe('PATCH /api/v1/tasks/:id/assignee (#30)', () => {
    it('unassigns task when sending null', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue({
        ...sampleTaskRow,
        assigneeId: otherUserId,
        assigneeName: 'Other Member',
      });
      updateTaskSpy.mockResolvedValue({
        ...sampleTaskRow,
        assigneeId: null,
        assigneeName: null,
      });

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}/assignee`)
        .set('Authorization', `Bearer ${token}`)
        .send({ assigneeId: null });

      expect(res.status).toBe(200);
      expect(res.body.task.assignee).toBeNull();
    });

    it('returns 422 assignee_not_a_member when assignee is not in project', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(sampleTaskRow);
      isProjectMemberSpy.mockResolvedValue(false);

      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}/assignee`)
        .set('Authorization', `Bearer ${token}`)
        .send({ assigneeId: otherUserId });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('assignee_not_a_member');
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('returns 204 when member deletes task', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue(sampleTaskRow);
      deleteTaskSpy.mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
      expect(deleteTaskSpy).toHaveBeenCalledWith(taskId);
    });

    it('returns 403 when viewer tries to delete task', async () => {
      getTaskByIdAndUserSpy.mockResolvedValue({
        ...sampleTaskRow,
        callerRole: 'viewer',
      });

      const res = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
