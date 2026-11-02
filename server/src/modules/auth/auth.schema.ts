import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('invalid email address')
    .max(254, 'email must be at most 254 characters'),
  password: z
    .string()
    .min(12, 'password must be at least 12 characters')
    .max(128, 'password must be at most 128 characters'),
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(100, 'name must be at most 100 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('invalid email address')
    .max(254, 'email must be at most 254 characters'),
  password: z
    .string()
    .min(1, 'password is required')
    .max(128, 'password must be at most 128 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

export type RefreshInput = z.infer<typeof refreshSchema>;

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export type LogoutInput = z.infer<typeof logoutSchema>;
