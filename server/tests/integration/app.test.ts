import type { Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { buildConfig } from '../../src/config/env.js';
import { createLogger } from '../../src/config/logger.js';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { validEnv } from '../helpers/env.js';

const ALLOWED = 'https://app.example.com';

const config = buildConfig(
  validEnv({
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://u:p@localhost/app',
    JWT_SECRET: 'test-secret',
    CORS_ORIGINS: ALLOWED,
  }),
);
const logger = createLogger({ level: 'silent' });
const app = createApp({ config, logger });

const errorShape = (code: string) => ({
  error: { code, message: expect.any(String), details: [], requestId: expect.any(String) },
});

describe('createApp', () => {
  it('returns independent instances', () => {
    const a = createApp({ config, logger });
    const b = createApp({ config, logger });

    expect(a).not.toBe(b);
    a.locals.marker = 'a';
    expect(b.locals.marker).toBeUndefined();
  });

  it('refuses * as a CORS origin even when config validation was bypassed', () => {
    const wildcard = { ...config, http: { ...config.http, corsOrigins: ['*'] } };

    expect(() => createApp({ config: wildcard, logger })).toThrow(/\* is invalid with credentials/);
  });

  it('answers 200 on /', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('trusts exactly one proxy hop', () => {
    expect(app.get('trust proxy')).toBe(1);
  });
});

describe('security headers', () => {
  it('sets helmet headers and a request id on every response, including 404s', async () => {
    const res = await request(app).get('/healthz');

    expect(res.headers['x-request-id']).toBeTruthy();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeTruthy();
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['content-security-policy']).toContain("script-src 'self'");
    expect(res.headers['cross-origin-embedder-policy']).toBeUndefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('errors', () => {
  it('answers an unknown route with 404 in the error shape', async () => {
    const res = await request(app).get('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual(errorShape('not_found'));
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('refuses a 200 KB JSON body with 413 in the error shape', async () => {
    const res = await request(app)
      .post('/api/v1/anything')
      .set('content-type', 'application/json')
      .send(JSON.stringify({ description: 'x'.repeat(200 * 1024) }));

    expect(res.status).toBe(413);
    expect(res.body).toEqual(errorShape('payload_too_large'));
  });

  it('answers malformed JSON with 400 in the error shape', async () => {
    const res = await request(app)
      .post('/api/v1/anything')
      .set('content-type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.body).toEqual(errorShape('invalid_json'));
  });

  it('answers an unexpected error with a generic 500 that leaks nothing', () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const req = { id: 'req-1', log: { error: vi.fn() } };

    errorHandler(
      new Error('password=hunter2 at db.internal'),
      req as unknown as Request,
      res as unknown as Response,
      () => {},
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'internal_error',
        message: 'Internal server error',
        details: [],
        requestId: 'req-1',
      },
    });
    expect(req.log.error).toHaveBeenCalled();
  });
});

describe('CORS', () => {
  it('allows a configured origin with credentials', async () => {
    const res = await request(app).get('/').set('origin', ALLOWED);

    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('answers a preflight from a configured origin', async () => {
    const res = await request(app)
      .options('/api/v1/tasks')
      .set('origin', ALLOWED)
      .set('access-control-request-method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
  });

  it('gives a disallowed origin no allow headers', async () => {
    const simple = await request(app).get('/').set('origin', 'https://evil.example');
    const preflight = await request(app)
      .options('/api/v1/tasks')
      .set('origin', 'https://evil.example')
      .set('access-control-request-method', 'POST');

    for (const res of [simple, preflight]) {
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
      expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    }
  });
});
