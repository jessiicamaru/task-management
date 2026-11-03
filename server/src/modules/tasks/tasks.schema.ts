import { z } from 'zod';

export const taskStatusEnum = z.enum(['todo', 'in_progress', 'done', 'archived']);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

export const taskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
export type TaskPriority = z.infer<typeof taskPriorityEnum>;

export const createTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(200, 'Title must be at most 200 characters'),
    description: z
      .string()
      .trim()
      .max(5000, 'Description must be at most 5000 characters')
      .nullable()
      .optional(),
    priority: taskPriorityEnum.default('medium'),
    dueDate: z.string().datetime({ offset: true }).nullable().optional(),
    assigneeId: z.string().uuid('Valid assignee UUID is required').nullable().optional(),
  })
  .strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title must be at most 200 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(5000, 'Description must be at most 5000 characters')
      .nullable()
      .optional(),
    priority: taskPriorityEnum.optional(),
    status: taskStatusEnum.optional(),
    dueDate: z.string().datetime({ offset: true }).nullable().optional(),
    assigneeId: z.string().uuid('Valid assignee UUID is required').nullable().optional(),
  })
  .strict();

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const updateTaskStatusSchema = z
  .object({
    status: taskStatusEnum,
  })
  .strict();

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export const updateTaskAssigneeSchema = z
  .object({
    assigneeId: z.string().uuid('Valid assignee UUID is required').nullable(),
  })
  .strict();

export type UpdateTaskAssigneeInput = z.infer<typeof updateTaskAssigneeSchema>;

export const taskIdParamSchema = z.object({
  id: z.string().uuid('Invalid task ID'),
});

export const projectTaskParamSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});

const assigneeIdFilter = z
  .string()
  .refine(
    (val) => val === 'me' || val === 'unassigned' || z.string().uuid().safeParse(val).success,
    { message: "assigneeId must be 'me', 'unassigned', or a valid UUID" },
  );

export const taskListQuerySchema = z.object({
  status: z.union([taskStatusEnum, z.array(taskStatusEnum)]).optional(),
  priority: z.union([taskPriorityEnum, z.array(taskPriorityEnum)]).optional(),
  assigneeId: assigneeIdFilter.optional(),
  dueBefore: z.string().datetime({ offset: true }).optional(),
  dueAfter: z.string().datetime({ offset: true }).optional(),
  q: z
    .string()
    .trim()
    .min(2, 'Search query must be at least 2 characters')
    .max(100, 'Search query must be at most 100 characters')
    .optional(),
  sort: z
    .enum([
      'createdAt',
      '-createdAt',
      'dueDate',
      '-dueDate',
      'priority',
      '-priority',
      'status',
      '-status',
    ])
    .default('-createdAt'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
  includeTotal: z.coerce.boolean().optional(),
});

export type TaskListQueryInput = z.infer<typeof taskListQuerySchema>;
