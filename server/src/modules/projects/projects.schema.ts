import { z } from 'zod';

export const projectRoleEnum = z.enum(['owner', 'admin', 'member', 'viewer']);
export type ProjectRole = z.infer<typeof projectRoleEnum>;

export const createProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Project name is required')
      .max(100, 'Project name must be at most 100 characters'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description must be at most 1000 characters')
      .optional(),
  })
  .strict();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Project name cannot be empty')
      .max(100, 'Project name must be at most 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, 'Description must be at most 1000 characters')
      .nullable()
      .optional(),
  })
  .strict();

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const addMemberSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.string().email('Valid email is required')),
    role: z.enum(['admin', 'member', 'viewer']),
  })
  .strict();

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z
  .object({
    role: z.enum(['admin', 'member', 'viewer']),
  })
  .strict();

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const transferOwnershipSchema = z
  .object({
    userId: z.string().uuid('Valid userId is required'),
  })
  .strict();

export type TransferOwnershipInput = z.infer<typeof transferOwnershipSchema>;

export const projectIdParamSchema = z.object({
  id: z.string().uuid('Invalid project ID'),
});

export const projectMemberParamSchema = z.object({
  id: z.string().uuid('Invalid project ID'),
  userId: z.string().uuid('Invalid user ID'),
});
