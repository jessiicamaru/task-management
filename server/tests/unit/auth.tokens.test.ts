import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import {
  generateRefreshToken,
  hashToken,
  JWT_AUDIENCE,
  JWT_ISSUER,
  signAccessToken,
  verifyAccessToken,
} from '../../src/modules/auth/tokens.js';
import { UnauthorizedError } from '../../src/utils/errors.js';

describe('Auth Tokens', () => {
  const secret = 'test-secret-at-least-32-chars-long!';

  describe('signAccessToken & verifyAccessToken', () => {
    it('generates a valid HS256 token with strict claims and parses it back', () => {
      const { token, expiresIn } = signAccessToken('usr_123', { secret, expiresIn: '15m' });
      expect(expiresIn).toBe(900);

      // Verify low-level claims with jsonwebtoken
      const raw = jwt.decode(token) as jwt.JwtPayload;
      expect(raw.sub).toBe('usr_123');
      expect(raw.iss).toBe(JWT_ISSUER);
      expect(raw.aud).toBe(JWT_AUDIENCE);
      expect(raw).toHaveProperty('jti');
      expect(raw).toHaveProperty('iat');
      expect(raw).toHaveProperty('exp');
      // Must not leak sensitive fields
      expect(raw).not.toHaveProperty('email');
      expect(raw).not.toHaveProperty('role');

      const verified = verifyAccessToken(token, secret);
      expect(verified.userId).toBe('usr_123');
      expect(verified.jti).toBe(raw.jti);
    });

    it('rejects tokens signed with a different secret', () => {
      const { token } = signAccessToken('usr_123', { secret: 'different-secret-key-123456789' });
      expect(() => verifyAccessToken(token, secret)).toThrow(UnauthorizedError);
      try {
        verifyAccessToken(token, secret);
        expect.unreachable();
      } catch (err) {
        expect((err as UnauthorizedError).code).toBe('invalid_token');
      }
    });

    it('rejects tokens with alg: none', () => {
      const token = jwt.sign({ sub: 'usr_123' }, '', { algorithm: 'none' as jwt.Algorithm });
      expect(() => verifyAccessToken(token, secret)).toThrow(UnauthorizedError);
    });

    it('distinguishes expired tokens with token_expired code', () => {
      const { token } = signAccessToken('usr_123', { secret, expiresIn: -60 });
      try {
        verifyAccessToken(token, secret);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(UnauthorizedError);
        expect((err as UnauthorizedError).code).toBe('token_expired');
      }
    });
  });

  describe('generateRefreshToken', () => {
    it('produces an unguessable 32-byte base64url token and its SHA-256 hash', () => {
      const { rawToken, tokenHash } = generateRefreshToken();
      expect(rawToken).toHaveLength(43); // 32 bytes base64url is 43 chars
      expect(tokenHash).toBe(hashToken(rawToken));
      expect(tokenHash).toHaveLength(64); // SHA-256 hex is 64 chars
    });
  });
});
