import type { NextFunction, Request, Response } from 'express';

import { verifyAccessToken } from '../modules/auth/tokens.js';
import { UnauthorizedError } from '../utils/errors.js';

// SECURITY: req.user.id comes ONLY from the verified cryptographic token.
// Never from req.body.userId, req.query.userId, or arbitrary untrusted headers.

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next(new UnauthorizedError('Authentication required', 'unauthorized'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer' || !parts[1]) {
    return next(new UnauthorizedError('Malformed authorization header', 'invalid_token'));
  }

  const token = parts[1];
  const secret = (req.app?.locals?.config as { jwt?: { secret?: string } })?.jwt?.secret;

  try {
    const payload = verifyAccessToken(token, secret);
    req.user = { id: payload.userId };
    next();
  } catch (err) {
    next(err);
  }
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer' || !parts[1]) {
    return next();
  }

  const secret = (req.app?.locals?.config as { jwt?: { secret?: string } })?.jwt?.secret;

  try {
    const payload = verifyAccessToken(parts[1], secret);
    req.user = { id: payload.userId };
  } catch {
    // In optional auth, an invalid token is treated as an unauthenticated guest
  }

  next();
}
