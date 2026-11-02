import express from 'express';
import rateLimit from 'express-rate-limit';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

describe('Rate Limiter Middleware', () => {
  it('returns 429 rate_limited when request limit is exceeded', async () => {
    const testApp = express();
    testApp.set('trust proxy', 1);

    const miniLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 2,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json({
          error: {
            code: 'rate_limited',
            message: 'Too many requests, please try again later.',
            details: [],
            requestId: 'req_limited',
          },
        });
      },
    });

    testApp.use(miniLimiter);
    testApp.get('/test', (_req, res) => res.status(200).json({ ok: true }));

    // Request 1
    const res1 = await request(testApp).get('/test');
    expect(res1.status).toBe(200);

    // Request 2
    const res2 = await request(testApp).get('/test');
    expect(res2.status).toBe(200);

    // Request 3 (exceeded)
    const res3 = await request(testApp).get('/test');
    expect(res3.status).toBe(429);
    expect(res3.headers['retry-after']).toBeDefined();
    expect(res3.body.error).toEqual({
      code: 'rate_limited',
      message: 'Too many requests, please try again later.',
      details: [],
      requestId: 'req_limited',
    });
  });
});
