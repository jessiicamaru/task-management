import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { buildConfig } from '../../src/config/env.js';
import { createLogger } from '../../src/config/logger.js';
import * as poolModule from '../../src/db/pool.js';
import { signAccessToken } from '../../src/modules/auth/tokens.js';
import { ProjectsController } from '../../src/modules/projects/projects.controller.js';
import type { ProjectsRepository } from '../../src/modules/projects/projects.repository.js';
import { createProjectsRouter } from '../../src/modules/projects/projects.routes.js';
import { ProjectsService } from '../../src/modules/projects/projects.service.js';
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

describe('Projects End-to-End API Integration Tests', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const otherUserId = '22222222-2222-4222-8222-222222222222';
  const projectId = '33333333-3333-4333-8333-333333333333';
  let token: string;
  let app: ReturnType<typeof createApp>;

  let createProjectWithMemberSpy: ReturnType<typeof vi.fn>;
  let listUserProjectsSpy: ReturnType<typeof vi.fn>;
  let getProjectByIdSpy: ReturnType<typeof vi.fn>;
  let updateProjectSpy: ReturnType<typeof vi.fn>;
  let deleteProjectSpy: ReturnType<typeof vi.fn>;
  let listMembersSpy: ReturnType<typeof vi.fn>;
  let findMemberSpy: ReturnType<typeof vi.fn>;
  let countOwnersSpy: ReturnType<typeof vi.fn>;
  let addMemberSpy: ReturnType<typeof vi.fn>;
  let updateMemberRoleSpy: ReturnType<typeof vi.fn>;
  let removeMemberSpy: ReturnType<typeof vi.fn>;
  let transferOwnershipSpy: ReturnType<typeof vi.fn>;
  let findUserByEmailSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    token = signAccessToken(userId, { secret: config.jwt.secret }).token;

    createProjectWithMemberSpy = vi.fn();
    listUserProjectsSpy = vi.fn();
    getProjectByIdSpy = vi.fn();
    updateProjectSpy = vi.fn();
    deleteProjectSpy = vi.fn();
    listMembersSpy = vi.fn();
    findMemberSpy = vi.fn();
    countOwnersSpy = vi.fn();
    addMemberSpy = vi.fn();
    updateMemberRoleSpy = vi.fn();
    removeMemberSpy = vi.fn();
    transferOwnershipSpy = vi.fn();
    findUserByEmailSpy = vi.fn();

    const mockRepo: ProjectsRepository = {
      createProjectWithMember: createProjectWithMemberSpy,
      listUserProjects: listUserProjectsSpy,
      getProjectById: getProjectByIdSpy,
      updateProject: updateProjectSpy,
      deleteProject: deleteProjectSpy,
      listMembers: listMembersSpy,
      findMember: findMemberSpy,
      countOwners: countOwnersSpy,
      addMember: addMemberSpy,
      updateMemberRole: updateMemberRoleSpy,
      removeMember: removeMemberSpy,
      transferOwnership: transferOwnershipSpy,
    };

    const mockAuthRepo = {
      findUserByEmailWithHash: findUserByEmailSpy,
    };

    const service = new ProjectsService(mockRepo, mockAuthRepo as never);
    const controller = new ProjectsController(service);

    const express = (await import('express')).default;
    const apiRouter = express.Router();
    apiRouter.use('/projects', createProjectsRouter({ controller }));

    app = createApp({ config, logger, apiRouter });
  });

  describe('POST /api/v1/projects', () => {
    it('returns 201 with project and Location header', async () => {
      createProjectWithMemberSpy.mockResolvedValue({
        id: projectId,
        name: 'Alpha Project',
        description: 'First test project',
        ownerId: userId,
        role: 'owner',
        createdAt: '2026-11-02T12:00:00.000Z',
        updatedAt: '2026-11-02T12:00:00.000Z',
      });

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Alpha Project', description: 'First test project' });

      expect(res.status).toBe(201);
      expect(res.headers.location).toBe(`/api/v1/projects/${projectId}`);
      expect(res.body.project.name).toBe('Alpha Project');
      expect(res.body.project.role).toBe('owner');
    });

    it('returns 422 if project name is missing', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('validation_failed');
    });
  });

  describe('GET /api/v1/projects', () => {
    it('returns 200 with list of caller projects and pagination metadata', async () => {
      listUserProjectsSpy.mockResolvedValue({
        rows: [
          {
            id: projectId,
            name: 'Alpha Project',
            description: null,
            ownerId: userId,
            role: 'owner',
            createdAt: '2026-11-02T12:00:00.000Z',
            updatedAt: '2026-11-02T12:00:00.000Z',
            memberCount: 1,
            taskCount: 3,
          },
        ],
        hasMore: false,
        nextCursor: null,
      });

      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.hasMore).toBe(false);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('returns 404 for non-members (anti-enumeration)', async () => {
      // Mock pool.query for project-guard: non-member returns 0 rows
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: [],
      });

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('not_found');
    });

    it('returns 200 with member and task counts for project members', async () => {
      // Mock pool.query for project-guard: user has member role
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      getProjectByIdSpy.mockResolvedValue({
        id: projectId,
        name: 'Alpha Project',
        description: 'Details',
        ownerId: otherUserId,
        role: 'member',
        createdAt: '2026-11-02T12:00:00.000Z',
        updatedAt: '2026-11-02T12:00:00.000Z',
        memberCount: 4,
        taskCounts: { todo: 2, inProgress: 1, done: 3, archived: 0, total: 6 },
      });

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.project.memberCount).toBe(4);
      expect(res.body.project.taskCounts.total).toBe(6);
    });
  });

  describe('PATCH /api/v1/projects/:id', () => {
    it('returns 403 if caller is only a member', async () => {
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [{ role: 'member' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      const res = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Renamed Project' });

      expect(res.status).toBe(403);
    });

    it('returns 422 if body contains ownerId (strict schema)', async () => {
      const res = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Renamed Project', ownerId: otherUserId });

      expect(res.status).toBe(422);
    });

    it('returns 200 for admin updating project', async () => {
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [{ role: 'admin' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      updateProjectSpy.mockResolvedValue({
        id: projectId,
        name: 'Updated Name',
        description: null,
        ownerId: otherUserId,
        createdAt: '2026-11-02T12:00:00.000Z',
        updatedAt: '2026-11-02T12:05:00.000Z',
      });

      const res = await request(app)
        .patch(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.project.name).toBe('Updated Name');
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('returns 403 if caller is admin rather than owner', async () => {
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [{ role: 'admin' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      const res = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('returns 204 when owner deletes project', async () => {
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [{ role: 'owner' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      deleteProjectSpy.mockResolvedValue(undefined);

      const res = await request(app)
        .delete(`/api/v1/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
      expect(deleteProjectSpy).toHaveBeenCalledWith(projectId);
    });
  });

  describe('POST /api/v1/projects/:id/members', () => {
    it('returns 404 user_not_found if email does not match any user', async () => {
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [{ role: 'admin' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      findUserByEmailSpy.mockResolvedValue(null);

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'ghost@example.com', role: 'member' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('user_not_found');
    });

    it('returns 409 if user is already a member', async () => {
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [{ role: 'admin' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      findUserByEmailSpy.mockResolvedValue({ id: otherUserId });
      findMemberSpy.mockResolvedValue({ role: 'member' });

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'existing@example.com', role: 'member' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('member_already_exists');
    });

    it('returns 403 if admin tries to add another admin', async () => {
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [{ role: 'admin' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'colleague@example.com', role: 'admin' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/projects/:id/members/me', () => {
    it('returns 409 last_owner when the only owner leaves', async () => {
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [{ role: 'owner' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      findMemberSpy.mockResolvedValue({ role: 'owner' });
      countOwnersSpy.mockResolvedValue(1);

      const res = await request(app)
        .delete(`/api/v1/projects/${projectId}/members/me`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('last_owner');
    });
  });

  describe('POST /api/v1/projects/:id/transfer-ownership', () => {
    it('returns 200 when owner transfers ownership to existing member', async () => {
      vi.spyOn(poolModule, 'query').mockResolvedValueOnce({
        rows: [{ role: 'owner' }],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      findMemberSpy.mockResolvedValue({ role: 'member' });
      transferOwnershipSpy.mockResolvedValue(undefined);

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/transfer-ownership`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: otherUserId });

      expect(res.status).toBe(200);
      expect(transferOwnershipSpy).toHaveBeenCalledWith(projectId, userId, otherUserId);
    });
  });
});
