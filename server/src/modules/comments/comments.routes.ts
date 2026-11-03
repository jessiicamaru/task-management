import { Router } from 'express';

import { commentsController, type CommentsController } from './comments.controller.js';
import { commentIdParamSchema, updateCommentSchema } from './comments.schema.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { validate } from '../../middlewares/validate.js';

export interface CreateCommentsRouterOptions {
  controller?: CommentsController | undefined;
}

export function createCommentsRouter({
  controller = commentsController,
}: CreateCommentsRouterOptions = {}): Router {
  const router = Router();

  // All comment endpoints require authentication
  router.use(authenticate);

  // PATCH /api/v1/comments/:id
  router.patch(
    '/:id',
    validate({ params: commentIdParamSchema, body: updateCommentSchema }),
    controller.updateComment,
  );

  // DELETE /api/v1/comments/:id
  router.delete('/:id', validate({ params: commentIdParamSchema }), controller.deleteComment);

  return router;
}
