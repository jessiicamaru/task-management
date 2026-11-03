import type { NextFunction, Request, Response } from 'express';

import type {
  CommentListQuery,
  CreateCommentInput,
  UpdateCommentInput,
} from './comments.schema.js';
import { type CommentsService, commentsService } from './comments.service.js';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] ?? '';
  return param ?? '';
}

export class CommentsController {
  constructor(private readonly service: CommentsService = commentsService) {}

  createComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const taskId = getParam(req.params.taskId);
      const input = req.body as CreateCommentInput;

      const comment = await this.service.createComment(taskId, userId, input);

      res.setHeader('Location', `/api/v1/comments/${comment.id}`);
      res.status(201).json({ comment });
    } catch (err) {
      next(err);
    }
  };

  listComments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const taskId = getParam(req.params.taskId);
      const query = (req.validated?.query ?? req.query) as CommentListQuery;

      const result = await this.service.listComments(taskId, userId, query);

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  updateComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const commentId = getParam(req.params.id);
      const input = req.body as UpdateCommentInput;

      const comment = await this.service.updateComment(commentId, userId, input);

      res.status(200).json({ comment });
    } catch (err) {
      next(err);
    }
  };

  deleteComment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const commentId = getParam(req.params.id);

      await this.service.deleteComment(commentId, userId);

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  };
}

export const commentsController = new CommentsController();
