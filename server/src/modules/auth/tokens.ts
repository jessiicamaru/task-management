import crypto from 'node:crypto';

import jwt, { type JwtPayload } from 'jsonwebtoken';

import { config } from '../../config/index.js';
import { UnauthorizedError } from '../../utils/errors.js';

export const JWT_ISSUER = 'task-management';
export const JWT_AUDIENCE = 'task-management-api';

export interface AccessTokenPayload {
  userId: string;
  jti: string;
}

export function parseTtlToSeconds(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15 minutes
  const value = parseInt(match[1] ?? '900', 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 900;
  }
}

export function signAccessToken(
  userId: string,
  options: { secret?: string; expiresIn?: string | number } = {},
): { token: string; expiresIn: number } {
  const secret = options.secret ?? config.jwt.secret;
  const ttlStr = config.jwt.accessTtl ?? '15m';
  const expiresInSeconds =
    typeof options.expiresIn === 'number'
      ? options.expiresIn
      : parseTtlToSeconds(typeof options.expiresIn === 'string' ? options.expiresIn : ttlStr);

  const jti = crypto.randomUUID();

  const token = jwt.sign({}, secret, {
    algorithm: 'HS256',
    subject: userId,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    jwtid: jti,
    expiresIn: expiresInSeconds,
  });

  return { token, expiresIn: expiresInSeconds };
}

export function verifyAccessToken(token: string, secretOverride?: string): AccessTokenPayload {
  const secret = secretOverride ?? config.jwt.secret;

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      clockTolerance: 30,
    }) as JwtPayload;

    if (!decoded.sub) {
      throw new UnauthorizedError('Invalid access token payload', 'invalid_token');
    }

    return {
      userId: decoded.sub,
      jti: decoded.jti ?? '',
    };
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired', 'token_expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid access token', 'invalid_token');
    }
    throw err;
  }
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateRefreshToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}
