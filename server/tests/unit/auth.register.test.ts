import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

import type { AuthRepository, UserRow } from '../../src/modules/auth/auth.repository.js';
import { registerSchema } from '../../src/modules/auth/auth.schema.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { verify } from '../../src/modules/auth/password.js';

describe('Auth Register - Unit Tests', () => {
  describe('registerSchema', () => {
    it('accepts valid credentials and normalizes email', () => {
      const parsed = registerSchema.parse({
        email: '  Alice@Example.com  ',
        password: 'correct horse battery staple',
        name: '  Alice Doe  ',
      });

      expect(parsed.email).toBe('alice@example.com');
      expect(parsed.name).toBe('Alice Doe');
      expect(parsed.password).toBe('correct horse battery staple');
    });

    it('rejects passwords shorter than 12 characters', () => {
      expect(() =>
        registerSchema.parse({
          email: 'alice@example.com',
          password: 'short',
          name: 'Alice',
        }),
      ).toThrow(ZodError);
    });

    it('rejects passwords longer than 128 characters', () => {
      expect(() =>
        registerSchema.parse({
          email: 'alice@example.com',
          password: 'a'.repeat(129),
          name: 'Alice',
        }),
      ).toThrow(ZodError);
    });

    it('rejects invalid email formats', () => {
      expect(() =>
        registerSchema.parse({
          email: 'not-an-email',
          password: 'valid-long-passphrase-here',
          name: 'Alice',
        }),
      ).toThrow(ZodError);
    });

    it('rejects empty or whitespace-only name', () => {
      expect(() =>
        registerSchema.parse({
          email: 'alice@example.com',
          password: 'valid-long-passphrase-here',
          name: '   ',
        }),
      ).toThrow(ZodError);
    });
  });

  describe('AuthService', () => {
    it('hashes the password with argon2id and never returns password_hash', async () => {
      let savedHash = '';
      const mockRepo: AuthRepository = {
        createUser: vi.fn().mockImplementation(({ email, passwordHash, name }) => {
          savedHash = passwordHash;
          const user: UserRow = {
            id: 'usr_123',
            email,
            name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return Promise.resolve(user);
        }),
      };

      const service = new AuthService(mockRepo);
      const user = await service.register({
        email: 'alice@example.com',
        password: 'super-secret-passphrase',
        name: 'Alice',
      });

      expect(user).toHaveProperty('id', 'usr_123');
      expect(user).toHaveProperty('email', 'alice@example.com');
      expect(user).toHaveProperty('name', 'Alice');
      expect(user).not.toHaveProperty('password_hash');
      expect(user).not.toHaveProperty('password');

      // Verify the saved hash matches the plain password
      expect(savedHash).toMatch(/^\$argon2id\$/);
      const isMatch = await verify(savedHash, 'super-secret-passphrase');
      expect(isMatch).toBe(true);
    });
  });
});
