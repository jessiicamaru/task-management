import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AuthRepository,
  RefreshTokenRow,
  UserRow,
  UserWithPasswordHash,
} from '../../src/modules/auth/auth.repository.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { hash } from '../../src/modules/auth/password.js';
import { hashToken } from '../../src/modules/auth/tokens.js';
import { UnauthorizedError } from '../../src/utils/errors.js';

describe('AuthService - Unit Tests', () => {
  let findUserByEmailSpy: ReturnType<typeof vi.fn>;
  let findUserByIdSpy: ReturnType<typeof vi.fn>;
  let createRefreshTokenSpy: ReturnType<typeof vi.fn>;
  let findRefreshTokenByHashSpy: ReturnType<typeof vi.fn>;
  let revokeRefreshTokenSpy: ReturnType<typeof vi.fn>;
  let revokeFamilySpy: ReturnType<typeof vi.fn>;
  let service: AuthService;

  beforeEach(() => {
    findUserByEmailSpy = vi.fn();
    findUserByIdSpy = vi.fn();
    createRefreshTokenSpy = vi.fn();
    findRefreshTokenByHashSpy = vi.fn();
    revokeRefreshTokenSpy = vi.fn();
    revokeFamilySpy = vi.fn();

    const mockRepo = {
      createUser: vi.fn(),
      findUserByEmailWithHash: findUserByEmailSpy,
      findUserById: findUserByIdSpy,
      updateUserPasswordHash: vi.fn(),
      createRefreshToken: createRefreshTokenSpy,
      findRefreshTokenByHash: findRefreshTokenByHashSpy,
      revokeRefreshToken: revokeRefreshTokenSpy,
      revokeFamily: revokeFamilySpy,
    } as unknown as AuthRepository;
    service = new AuthService(mockRepo);
  });

  describe('login', () => {
    it('throws 401 invalid_credentials if user is not found', async () => {
      findUserByEmailSpy.mockResolvedValue(null);

      await expect(
        service.login({ email: 'missing@example.com', password: 'password123456' }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('throws 401 invalid_credentials if password is incorrect', async () => {
      const realPasswordHash = await hash('correct-password-1234');
      const user: UserWithPasswordHash = {
        id: 'usr_1',
        email: 'alice@example.com',
        name: 'Alice',
        passwordHash: realPasswordHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      findUserByEmailSpy.mockResolvedValue(user);

      await expect(
        service.login({ email: 'alice@example.com', password: 'wrong-password-1234' }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('returns access & refresh tokens on valid credentials', async () => {
      const password = 'valid-password-1234';
      const passwordHash = await hash(password);
      const user: UserWithPasswordHash = {
        id: 'usr_1',
        email: 'alice@example.com',
        name: 'Alice',
        passwordHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      findUserByEmailSpy.mockResolvedValue(user);
      createRefreshTokenSpy.mockResolvedValue({
        id: 'tok_1',
        userId: 'usr_1',
        tokenHash: 'hash',
        familyId: 'fam_1',
        expiresAt: new Date().toISOString(),
        revokedAt: null,
        replacedBy: null,
        userAgent: null,
        ip: null,
        createdAt: new Date().toISOString(),
      });

      const result = await service.login({ email: 'alice@example.com', password });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: 'usr_1',
        email: 'alice@example.com',
        name: 'Alice',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('refresh', () => {
    it('detects reuse of already-revoked tokens and revokes the whole family', async () => {
      const tokenHash = hashToken('stolen-old-token');
      const revokedToken: RefreshTokenRow = {
        id: 'tok_old',
        userId: 'usr_1',
        tokenHash,
        familyId: 'fam_compromised',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
        revokedAt: new Date().toISOString(),
        replacedBy: 'tok_new',
        userAgent: null,
        ip: null,
        createdAt: new Date().toISOString(),
      };

      findRefreshTokenByHashSpy.mockResolvedValue(revokedToken);

      try {
        await service.refresh('stolen-old-token');
        expect.unreachable('Should throw on reuse');
      } catch (err) {
        expect(err).toBeInstanceOf(UnauthorizedError);
        expect((err as UnauthorizedError).message).toContain('reuse detected');
        expect(revokeFamilySpy).toHaveBeenCalledWith('fam_compromised');
      }
    });

    it('rotates refresh token and returns new session pair for valid token', async () => {
      const tokenHash = hashToken('valid-token');
      const validToken: RefreshTokenRow = {
        id: 'tok_live',
        userId: 'usr_1',
        tokenHash,
        familyId: 'fam_safe',
        expiresAt: new Date(Date.now() + 100000).toISOString(),
        revokedAt: null,
        replacedBy: null,
        userAgent: null,
        ip: null,
        createdAt: new Date().toISOString(),
      };

      const user: UserRow = {
        id: 'usr_1',
        email: 'alice@example.com',
        name: 'Alice',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      findRefreshTokenByHashSpy.mockResolvedValue(validToken);
      findUserByIdSpy.mockResolvedValue(user);
      createRefreshTokenSpy.mockResolvedValue({
        id: 'tok_new_rotated',
        userId: 'usr_1',
        tokenHash: 'new_hash',
        familyId: 'fam_safe',
        expiresAt: new Date().toISOString(),
        revokedAt: null,
        replacedBy: null,
        userAgent: null,
        ip: null,
        createdAt: new Date().toISOString(),
      });

      const result = await service.refresh('valid-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(revokeRefreshTokenSpy).toHaveBeenCalledWith('tok_live', 'tok_new_rotated');
    });
  });
});
