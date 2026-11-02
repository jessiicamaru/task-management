import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { buildConfig } from '../../src/config/env.js';
import { createLogger } from '../../src/config/logger.js';
import { AuthController } from '../../src/modules/auth/auth.controller.js';
import type { AuthRepository, UserRow } from '../../src/modules/auth/auth.repository.js';
import { createAuthRouter } from '../../src/modules/auth/auth.routes.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { hash } from '../../src/modules/auth/password.js';
import { signAccessToken } from '../../src/modules/auth/tokens.js';
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

describe('Full Auth Flow Integration Tests', () => {
  let findUserByEmailSpy: ReturnType<typeof vi.fn>;
  let findUserByIdSpy: ReturnType<typeof vi.fn>;
  let createRefreshTokenSpy: ReturnType<typeof vi.fn>;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    findUserByEmailSpy = vi.fn();
    findUserByIdSpy = vi.fn();
    createRefreshTokenSpy = vi.fn();

    const mockRepo = {
      createUser: vi.fn(),
      findUserByEmailWithHash: findUserByEmailSpy,
      findUserById: findUserByIdSpy,
      updateUserPasswordHash: vi.fn(),
      createRefreshToken: createRefreshTokenSpy,
      findRefreshTokenByHash: vi.fn(),
      revokeRefreshToken: vi.fn(),
      revokeFamily: vi.fn(),
    } as unknown as AuthRepository;

    const service = new AuthService(mockRepo);
    const controller = new AuthController(service);

    const express = (await import('express')).default;
    const apiRouter = express.Router();
    apiRouter.use('/auth', createAuthRouter({ controller }));

    app = createApp({ config, logger, apiRouter });
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 401 invalid_credentials for unknown user', async () => {
      findUserByEmailSpy.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@example.com', password: 'password1234' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('invalid_credentials');
    });

    it('returns 200 with access & refresh tokens on valid credentials', async () => {
      const password = 'my-secret-password-123';
      const passwordHash = await hash(password);

      const user: UserRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'bob@example.com',
        name: 'Bob',
        createdAt: '2026-11-02T12:00:00.000Z',
        updatedAt: '2026-11-02T12:00:00.000Z',
      };

      findUserByEmailSpy.mockResolvedValue({
        ...user,
        passwordHash,
      });

      createRefreshTokenSpy.mockResolvedValue({
        id: 'tok_uuid',
        userId: user.id,
        tokenHash: 'tok_hash',
        familyId: 'fam_uuid',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
        revokedAt: null,
        replacedBy: null,
        userAgent: null,
        ip: null,
        createdAt: new Date().toISOString(),
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'bob@example.com', password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toEqual({
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('unauthorized');
    });

    it('returns 200 with current user profile for valid Bearer token', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const user: UserRow = {
        id: userId,
        email: 'alice@example.com',
        name: 'Alice',
        createdAt: '2026-11-02T12:00:00.000Z',
        updatedAt: '2026-11-02T12:00:00.000Z',
      };

      findUserByIdSpy.mockResolvedValue(user);

      const { token } = signAccessToken(userId, { secret: config.jwt.secret });

      const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      });
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('returns 204 No Content', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'active-token-to-revoke' });

      expect(res.status).toBe(204);
    });
  });
});
