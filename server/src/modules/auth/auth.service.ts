import crypto from 'node:crypto';

import { authRepository, type AuthRepository, type UserRow } from './auth.repository.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';
import { dummyVerify, hash, needsRehash, verify } from './password.js';
import { generateRefreshToken, hashToken, parseTtlToSeconds, signAccessToken } from './tokens.js';
import { config } from '../../config/index.js';
import { UnauthorizedError } from '../../utils/errors.js';

export interface AuthSessionResult {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: UserRow;
}

export interface RefreshResult {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

export interface ClientMeta {
  userAgent?: string | undefined;
  ip?: string | undefined;
}

export class AuthService {
  constructor(private readonly repository: AuthRepository = authRepository) {}

  async register({ email, password, name }: RegisterInput): Promise<UserRow> {
    const passwordHash = await hash(password);
    return this.repository.createUser({ email, passwordHash, name });
  }

  async login(
    { email, password }: LoginInput,
    clientMeta: ClientMeta = {},
  ): Promise<AuthSessionResult> {
    const user = await this.repository.findUserByEmailWithHash(email);

    if (!user) {
      await dummyVerify(password);
      throw new UnauthorizedError('Invalid credentials', 'invalid_credentials');
    }

    const isValid = await verify(user.passwordHash, password);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials', 'invalid_credentials');
    }

    // Rehash on login if parameters are outdated
    if (needsRehash(user.passwordHash)) {
      const newHash = await hash(password);
      await this.repository.updateUserPasswordHash(user.id, newHash);
    }

    const { token: accessToken, expiresIn } = signAccessToken(user.id);
    const { rawToken, tokenHash } = generateRefreshToken();

    const ttlSeconds = parseTtlToSeconds(config.jwt.refreshTtl ?? '7d');
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const familyId = crypto.randomUUID();

    await this.repository.createRefreshToken({
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt,
      userAgent: clientMeta.userAgent,
      ip: clientMeta.ip,
    });

    return {
      accessToken,
      expiresIn,
      refreshToken: rawToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async refresh(refreshToken: string, clientMeta: ClientMeta = {}): Promise<RefreshResult> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.repository.findRefreshTokenByHash(tokenHash);

    if (!stored) {
      throw new UnauthorizedError('Invalid refresh token', 'invalid_token');
    }

    // Reuse detection: if an already-revoked token is presented, revoke the entire token family
    if (stored.revokedAt !== null) {
      await this.repository.revokeFamily(stored.familyId);
      throw new UnauthorizedError('Refresh token reuse detected', 'invalid_token');
    }

    // Check expiration
    if (new Date(stored.expiresAt) <= new Date()) {
      throw new UnauthorizedError('Refresh token has expired', 'token_expired');
    }

    const user = await this.repository.findUserById(stored.userId);
    if (!user) {
      throw new UnauthorizedError('User not found', 'invalid_token');
    }

    // Rotate: generate new token in same family and mark old token revoked with replaced_by link
    const { rawToken: newRawToken, tokenHash: newTokenHash } = generateRefreshToken();
    const ttlSeconds = parseTtlToSeconds(config.jwt.refreshTtl ?? '7d');
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const newTokenRow = await this.repository.createRefreshToken({
      userId: stored.userId,
      tokenHash: newTokenHash,
      familyId: stored.familyId,
      expiresAt,
      userAgent: clientMeta.userAgent,
      ip: clientMeta.ip,
    });

    await this.repository.revokeRefreshToken(stored.id, newTokenRow.id);

    const { token: accessToken, expiresIn } = signAccessToken(stored.userId);

    return {
      accessToken,
      expiresIn,
      refreshToken: newRawToken,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = hashToken(refreshToken);
    const stored = await this.repository.findRefreshTokenByHash(tokenHash);
    if (stored && stored.revokedAt === null) {
      await this.repository.revokeRefreshToken(stored.id);
    }
  }

  async getMe(userId: string): Promise<UserRow> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found', 'invalid_token');
    }
    return user;
  }
}

export const authService = new AuthService();
