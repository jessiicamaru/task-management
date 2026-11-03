import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { buildConfig } from '../../src/config/env.js';
import { createLogger } from '../../src/config/logger.js';
import { signAccessToken } from '../../src/modules/auth/tokens.js';
import { CommentsController } from '../../src/modules/comments/comments.controller.js';
import type {
  CommentDto,
  CommentListResult,
  CommentsRepository,
} from '../../src/modules/comments/comments.repository.js';
import { createCommentsRouter } from '../../src/modules/comments/comments.routes.js';
import { CommentsService } from '../../src/modules/comments/comments.service.js';
import { createTasksRouter } from '../../src/modules/tasks/tasks.routes.js';
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

describe('Comments API Integration Tests (#31)', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const otherUserId = '22222222-2222-4222-8222-222222222222';
  const taskId = '33333333-3333-4333-8333-333333333333';
  const commentId = '44444444-4444-4444-8444-444444444444';

  let token: string;
  let app: ReturnType<typeof createApp>;

  let findTaskWithMembershipSpy: ReturnType<typeof vi.fn>;
  let findCommentWithMembershipSpy: ReturnType<typeof vi.fn>;
  let createCommentSpy: ReturnType<typeof vi.fn>;
  let updateCommentSpy: ReturnType<typeof vi.fn>;
  let deleteCommentSpy: ReturnType<typeof vi.fn>;
  let listCommentsSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    token = signAccessToken(userId, { secret: config.jwt.secret }).token;

    findTaskWithMembershipSpy = vi.fn();
    findCommentWithMembershipSpy = vi.fn();
    createCommentSpy = vi.fn();
    updateCommentSpy = vi.fn();
    deleteCommentSpy = vi.fn();
    listCommentsSpy = vi.fn();

    const mockRepo = {
      findTaskWithMembership: findTaskWithMembershipSpy,
      findCommentWithMembership: findCommentWithMembershipSpy,
      createComment: createCommentSpy,
      updateComment: updateCommentSpy,
      deleteComment: deleteCommentSpy,
      listComments: listCommentsSpy,
    } as unknown as CommentsRepository;

    const service = new CommentsService(mockRepo);
    const controller = new CommentsController(service);

    const apiRouter = express.Router();
    apiRouter.use('/comments', createCommentsRouter({ controller }));
    apiRouter.use('/tasks', createTasksRouter({ commentsController: controller }));

    app = createApp({ config, logger, apiRouter });
  });

  describe('POST /api/v1/tasks/:taskId/comments', () => {
    it('returns 201 with Location header and author name for member', async () => {
      findTaskWithMembershipSpy.mockResolvedValueOnce({
        id: taskId,
        projectId: 'project-1',
        callerRole: 'member',
      });

      const createdDto: CommentDto = {
        id: commentId,
        taskId,
        body: 'Great progress on this task!',
        author: { id: userId, name: 'Alice Author' },
        createdAt: '2026-11-03T12:00:00.000Z',
        updatedAt: '2026-11-03T12:00:00.000Z',
        editedAt: null,
      };
      createCommentSpy.mockResolvedValueOnce(createdDto);

      const res = await request(app)
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'Great progress on this task!' });

      expect(res.status).toBe(201);
      expect(res.headers.location).toBe(`/api/v1/comments/${commentId}`);
      expect(res.body.comment.author.name).toBe('Alice Author');
      expect(res.body.comment.editedAt).toBeNull();
    });

    it('returns 403 when a viewer attempts to post a comment', async () => {
      findTaskWithMembershipSpy.mockResolvedValueOnce({
        id: taskId,
        projectId: 'project-1',
        callerRole: 'viewer',
      });

      const res = await request(app)
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'Viewer comment' });

      expect(res.status).toBe(403);
    });

    it('returns 404 when non-member attempts to post a comment (anti-enumeration)', async () => {
      findTaskWithMembershipSpy.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'Non member comment' });

      expect(res.status).toBe(404);
    });

    it('returns 422 when body exceeds 5000 characters', async () => {
      const longBody = 'a'.repeat(5001);
      const res = await request(app)
        .post(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: longBody });

      expect(res.status).toBe(422);
      expect(createCommentSpy).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/tasks/:taskId/comments', () => {
    it('returns 200 with comments list for viewer', async () => {
      findTaskWithMembershipSpy.mockResolvedValueOnce({
        id: taskId,
        projectId: 'project-1',
        callerRole: 'viewer',
      });

      const listResult: CommentListResult = {
        data: [
          {
            id: commentId,
            taskId,
            body: 'First comment',
            author: { id: userId, name: 'Alice Author' },
            createdAt: '2026-11-03T12:00:00.000Z',
            updatedAt: '2026-11-03T12:00:00.000Z',
            editedAt: null,
          },
        ],
        pagination: {
          nextCursor: null,
          hasMore: false,
          limit: 50,
        },
      };
      listCommentsSpy.mockResolvedValueOnce(listResult);

      const res = await request(app)
        .get(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].author.name).toBe('Alice Author');
    });

    it('returns 404 when non-member reads comments', async () => {
      findTaskWithMembershipSpy.mockResolvedValueOnce(null);

      const res = await request(app)
        .get(`/api/v1/tasks/${taskId}/comments`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/comments/:id', () => {
    it('allows author to edit comment and returns non-null editedAt', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce({
        id: commentId,
        taskId,
        authorId: userId,
        callerRole: 'member',
      });

      const updatedDto: CommentDto = {
        id: commentId,
        taskId,
        body: 'Updated body text',
        author: { id: userId, name: 'Alice Author' },
        createdAt: '2026-11-03T12:00:00.000Z',
        updatedAt: '2026-11-03T12:10:00.000Z',
        editedAt: '2026-11-03T12:10:00.000Z',
      };
      updateCommentSpy.mockResolvedValueOnce(updatedDto);

      const res = await request(app)
        .patch(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'Updated body text' });

      expect(res.status).toBe(200);
      expect(res.body.comment.editedAt).toBe('2026-11-03T12:10:00.000Z');
      expect(updateCommentSpy).toHaveBeenCalledWith(commentId, 'Updated body text');
    });

    it('returns 403 when another member tries to edit someone elses comment', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce({
        id: commentId,
        taskId,
        authorId: otherUserId,
        callerRole: 'member',
      });

      const res = await request(app)
        .patch(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'Hijacked comment' });

      expect(res.status).toBe(403);
    });

    it('returns 403 when a project admin tries to edit someone elses comment', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce({
        id: commentId,
        taskId,
        authorId: otherUserId,
        callerRole: 'admin',
      });

      const res = await request(app)
        .patch(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'Admin editing someone elses comment' });

      expect(res.status).toBe(403);
    });

    it('returns 404 when comment does not exist or caller not in project', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ body: 'Comment edit' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/comments/:id', () => {
    it('allows author to delete own comment', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce({
        id: commentId,
        taskId,
        authorId: userId,
        callerRole: 'member',
      });

      const res = await request(app)
        .delete(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
      expect(deleteCommentSpy).toHaveBeenCalledWith(commentId);
    });

    it('allows project admin to delete someone elses comment (moderation)', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce({
        id: commentId,
        taskId,
        authorId: otherUserId,
        callerRole: 'admin',
      });

      const res = await request(app)
        .delete(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(204);
      expect(deleteCommentSpy).toHaveBeenCalledWith(commentId);
    });

    it('returns 403 when a regular member tries to delete someone elses comment', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce({
        id: commentId,
        taskId,
        authorId: otherUserId,
        callerRole: 'member',
      });

      const res = await request(app)
        .delete(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(deleteCommentSpy).not.toHaveBeenCalled();
    });

    it('returns 404 when non-member tries to delete comment', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce(null);

      const res = await request(app)
        .delete(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
