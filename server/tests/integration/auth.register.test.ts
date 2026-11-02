import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { buildConfig } from '../../src/config/env.js';
import { createLogger } from '../../src/config/logger.js';
import { AuthController } from '../../src/modules/auth/auth.controller.js';
import type { AuthRepository } from '../../src/modules/auth/auth.repository.js';
import { createAuthRouter } from '../../src/modules/auth/auth.routes.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { ConflictError } from '../../src/utils/errors.js';
import { validEnv } from '../helpers/env.js';

const config = buildConfig(
  validEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://u:p@localhost/app',
    JWT_SECRET: 'test-secret',
    CORS_ORIGINS: 'https://app.example.com',
  }),
);
const logger = createLogger({ level: 'silent' });

describe('POST /api/v1/auth/register', () => {
  it('returns 201 with Location header and user object without password_hash', async () => {
    const mockRepo = {
      createUser: vi.fn().mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'alice@example.com',
        name: 'Alice',
        createdAt: '2026-11-02T12:00:00.000Z',
        updatedAt: '2026-11-02T12:00:00.000Z',
      }),
    } as unknown as AuthRepository;

    const service = new AuthService(mockRepo);
    const controller = new AuthController(service);
    const authRouter = createAuthRouter({ controller });

    const express = (await import('express')).default;
    const apiRouter = express.Router();
    apiRouter.use('/auth', authRouter);

    const app = createApp({ config, logger, apiRouter });

    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'Alice@Example.com',
      password: 'valid-secure-passphrase',
      name: 'Alice',
    });

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe('/api/v1/users/123e4567-e89b-12d3-a456-426614174000');
    expect(res.body).toEqual({
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'alice@example.com',
        name: 'Alice',
        createdAt: '2026-11-02T12:00:00.000Z',
      },
    });
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('returns 409 conflict when email is already registered', async () => {
    const mockRepo = {
      createUser: vi
        .fn()
        .mockRejectedValue(
          new ConflictError('Email already registered', 'email_already_registered'),
        ),
    } as unknown as AuthRepository;

    const service = new AuthService(mockRepo);
    const controller = new AuthController(service);
    const authRouter = createAuthRouter({ controller });

    const express = (await import('express')).default;
    const apiRouter = express.Router();
    apiRouter.use('/auth', authRouter);

    const app = createApp({ config, logger, apiRouter });

    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'duplicate@example.com',
      password: 'valid-secure-passphrase',
      name: 'Duplicate',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'email_already_registered',
      message: 'Email already registered',
    });
  });

  it('returns 422 validation error when password is too short', async () => {
    const app = createApp({ config, logger });

    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      password: 'short',
      name: 'Tester',
    });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_failed');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'body.password',
        }),
      ]),
    );
  });
});
