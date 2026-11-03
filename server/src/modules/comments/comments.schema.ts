import { z } from 'zod';

export const commentBodySchema = z
  .string()
  .trim()
  .min(1, 'Body must not be empty')
  .max(5000, 'Body must not exceed 5000 characters');

export const createCommentSchema = z.object({
  body: commentBodySchema,
});

export const updateCommentSchema = z.object({
  body: commentBodySchema,
});

export const commentIdParamSchema = z.object({
  id: z.string().uuid('Invalid comment ID'),
});

export const taskCommentParamSchema = z.object({
  taskId: z.string().uuid('Invalid task ID'),
});

export const commentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CommentListQuery = z.infer<typeof commentListQuerySchema>;
