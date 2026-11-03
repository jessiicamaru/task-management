import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  CommentDto,
  CommentsRepository,
} from '../../src/modules/comments/comments.repository.js';
import { CommentsService } from '../../src/modules/comments/comments.service.js';
import { ForbiddenError, NotFoundError } from '../../src/utils/errors.js';

describe('CommentsService - Unit Tests', () => {
  let findTaskWithMembershipSpy: ReturnType<typeof vi.fn>;
  let findCommentWithMembershipSpy: ReturnType<typeof vi.fn>;
  let createCommentSpy: ReturnType<typeof vi.fn>;
  let updateCommentSpy: ReturnType<typeof vi.fn>;
  let deleteCommentSpy: ReturnType<typeof vi.fn>;
  let listCommentsSpy: ReturnType<typeof vi.fn>;

  let service: CommentsService;

  beforeEach(() => {
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

    service = new CommentsService(mockRepo);
  });

  describe('listComments', () => {
    it('throws NotFoundError if task not found or user is not a project member', async () => {
      findTaskWithMembershipSpy.mockResolvedValueOnce(null);

      await expect(service.listComments('task-1', 'user-1', { limit: 50 })).rejects.toThrow(
        NotFoundError,
      );

      findTaskWithMembershipSpy.mockResolvedValueOnce({
        id: 'task-1',
        projectId: 'project-1',
        callerRole: null,
      });

      await expect(service.listComments('task-1', 'user-1', { limit: 50 })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('returns paginated comments for viewer', async () => {
      findTaskWithMembershipSpy.mockResolvedValueOnce({
        id: 'task-1',
        projectId: 'project-1',
        callerRole: 'viewer',
      });
      listCommentsSpy.mockResolvedValueOnce({
        data: [],
        pagination: { nextCursor: null, hasMore: false, limit: 50 },
      });

      const result = await service.listComments('task-1', 'user-1', { limit: 50 });
      expect(result.data).toEqual([]);
      expect(listCommentsSpy).toHaveBeenCalledWith('task-1', 50, undefined);
    });
  });

  describe('createComment', () => {
    it('throws NotFoundError if task not found or user is not a member', async () => {
      findTaskWithMembershipSpy.mockResolvedValueOnce(null);

      await expect(service.createComment('task-1', 'user-1', { body: 'Hello' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('throws ForbiddenError if caller role is viewer', async () => {
      findTaskWithMembershipSpy.mockResolvedValueOnce({
        id: 'task-1',
        projectId: 'project-1',
        callerRole: 'viewer',
      });

      await expect(service.createComment('task-1', 'user-1', { body: 'Hello' })).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('creates comment when caller is a member', async () => {
      findTaskWithMembershipSpy.mockResolvedValueOnce({
        id: 'task-1',
        projectId: 'project-1',
        callerRole: 'member',
      });
      const mockComment: CommentDto = {
        id: 'comment-1',
        taskId: 'task-1',
        body: 'Hello',
        author: { id: 'user-1', name: 'User One' },
        createdAt: '2026-11-03T12:00:00Z',
        updatedAt: '2026-11-03T12:00:00Z',
        editedAt: null,
      };
      createCommentSpy.mockResolvedValueOnce(mockComment);

      const result = await service.createComment('task-1', 'user-1', { body: 'Hello' });
      expect(result).toEqual(mockComment);
      expect(createCommentSpy).toHaveBeenCalledWith('task-1', 'user-1', 'Hello');
    });
  });

  describe('updateComment', () => {
    it('throws NotFoundError if comment not found or caller not in project', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce(null);

      await expect(
        service.updateComment('comment-1', 'user-1', { body: 'Updated' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError if user is not author, even if project admin', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce({
        id: 'comment-1',
        taskId: 'task-1',
        authorId: 'other-user',
        callerRole: 'admin',
      });

      await expect(
        service.updateComment('comment-1', 'user-1', { body: 'Updated' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('updates comment when user is author', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce({
        id: 'comment-1',
        taskId: 'task-1',
        authorId: 'user-1',
        callerRole: 'member',
      });
      const updatedDto: CommentDto = {
        id: 'comment-1',
        taskId: 'task-1',
        body: 'Updated body',
        author: { id: 'user-1', name: 'User One' },
        createdAt: '2026-11-03T12:00:00Z',
        updatedAt: '2026-11-03T12:05:00Z',
        editedAt: '2026-11-03T12:05:00Z',
      };
      updateCommentSpy.mockResolvedValueOnce(updatedDto);

      const result = await service.updateComment('comment-1', 'user-1', {
        body: 'Updated body',
      });
      expect(result.editedAt).toBe('2026-11-03T12:05:00Z');
      expect(updateCommentSpy).toHaveBeenCalledWith('comment-1', 'Updated body');
    });
  });

  describe('deleteComment', () => {
    it('throws NotFoundError if comment not found or caller not in project', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce(null);

      await expect(service.deleteComment('comment-1', 'user-1')).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when non-author member tries to delete', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce({
        id: 'comment-1',
        taskId: 'task-1',
        authorId: 'other-user',
        callerRole: 'member',
      });

      await expect(service.deleteComment('comment-1', 'user-1')).rejects.toThrow(ForbiddenError);
    });

    it('allows author to delete own comment', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce({
        id: 'comment-1',
        taskId: 'task-1',
        authorId: 'user-1',
        callerRole: 'member',
      });

      await service.deleteComment('comment-1', 'user-1');
      expect(deleteCommentSpy).toHaveBeenCalledWith('comment-1');
    });

    it('allows project admin to delete someone elses comment', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce({
        id: 'comment-1',
        taskId: 'task-1',
        authorId: 'other-user',
        callerRole: 'admin',
      });

      await service.deleteComment('comment-1', 'user-1');
      expect(deleteCommentSpy).toHaveBeenCalledWith('comment-1');
    });

    it('allows project owner to delete someone elses comment', async () => {
      findCommentWithMembershipSpy.mockResolvedValueOnce({
        id: 'comment-1',
        taskId: 'task-1',
        authorId: 'other-user',
        callerRole: 'owner',
      });

      await service.deleteComment('comment-1', 'user-1');
      expect(deleteCommentSpy).toHaveBeenCalledWith('comment-1');
    });
  });
});
