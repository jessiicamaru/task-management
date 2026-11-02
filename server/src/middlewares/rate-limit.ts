import rateLimit from 'express-rate-limit';

import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { getRequestId } from '../utils/request-context.js';

export const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) => {
    const requestId = getRequestId() || 'unknown';
    logger.warn({ ip: req.ip, path: req.path }, 'global rate limit exceeded');
    res.status(429).json({
      error: {
        code: 'rate_limited',
        message: 'Too many requests, please try again later.',
        details: [],
        requestId,
      },
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per 15 minutes
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only failed authentication attempts count against the quota
  handler: (req, res) => {
    const requestId = getRequestId() || 'unknown';
    logger.warn({ ip: req.ip, path: req.path }, 'auth rate limit exceeded');
    res.status(429).json({
      error: {
        code: 'rate_limited',
        message: 'Too many authentication attempts, please try again later.',
        details: [],
        requestId,
      },
    });
  },
});
