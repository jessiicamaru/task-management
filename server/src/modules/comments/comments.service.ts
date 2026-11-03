import {
  type CommentDto,
  type CommentListResult,
  type CommentsRepository,
  commentsRepository,
} from './comments.repository.js';
import type {
  CommentListQuery,
  CreateCommentInput,
  UpdateCommentInput,
} from './comments.schema.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';

export class CommentsService {
  constructor(private readonly repo: CommentsRepository = commentsRepository) {}

  async listComments(
    taskId: string,
    userId: string,
    query: CommentListQuery,
  ): Promise<CommentListResult> {
    const task = await this.repo.findTaskWithMembership(taskId, userId);
    if (!task || !task.callerRole) {
      throw new NotFoundError('Task not found', 'not_found');
    }

    return this.repo.listComments(taskId, query.limit, query.cursor);
  }

  async createComment(
    taskId: string,
    userId: string,
    input: CreateCommentInput,
  ): Promise<CommentDto> {
    const task = await this.repo.findTaskWithMembership(taskId, userId);
    if (!task || !task.callerRole) {
      throw new NotFoundError('Task not found', 'not_found');
    }

    if (task.callerRole === 'viewer') {
      throw new ForbiddenError(
        'Insufficient permissions to comment on tasks',
        'insufficient_permissions',
      );
    }

    return this.repo.createComment(taskId, userId, input.body);
  }

  async updateComment(
    commentId: string,
    userId: string,
    input: UpdateCommentInput,
  ): Promise<CommentDto> {
    const comment = await this.repo.findCommentWithMembership(commentId, userId);
    if (!comment || !comment.callerRole) {
      throw new NotFoundError('Comment not found', 'not_found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenError(
        'Only the comment author can edit this comment',
        'insufficient_permissions',
      );
    }

    return this.repo.updateComment(commentId, input.body);
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.repo.findCommentWithMembership(commentId, userId);
    if (!comment || !comment.callerRole) {
      throw new NotFoundError('Comment not found', 'not_found');
    }

    const isAuthor = comment.authorId === userId;
    const isProjectAdmin = comment.callerRole === 'admin' || comment.callerRole === 'owner';

    if (!isAuthor && !isProjectAdmin) {
      throw new ForbiddenError(
        'Insufficient permissions to delete this comment',
        'insufficient_permissions',
      );
    }

    await this.repo.deleteComment(commentId);
  }
}

export const commentsService = new CommentsService();
