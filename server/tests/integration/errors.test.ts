import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createApp } from '../../src/app.js';
import { buildConfig } from '../../src/config/env.js';
import { createLogger } from '../../src/config/logger.js';
import { NotFoundError } from '../../src/utils/errors.js';
import { validEnv } from '../helpers/env.js';

function setup(configure: (router: Router) => void, nodeEnv = 'test') {
  const lines: string[] = [];
  const logger = createLogger({ level: 'info', destination: { write: (l) => lines.push(l) } });
  const config = buildConfig(
    validEnv({
      NODE_ENV: nodeEnv,
      DATABASE_URL: 'postgres://u:p@localhost/app',
      JWT_SECRET: 'x'.repeat(40),
      CORS_ORIGINS: 'https://app.example.com',
    }),
  );
  const apiRouter = Router();
  configure(apiRouter);
  return {
    app: createApp({ logger, config, apiRouter }),
    logs: () => lines.map((line) => JSON.parse(line) as Record<string, any>),
  };
}

const pgError = (code: string) =>
  Object.assign(new Error('duplicate key value violates unique constraint "users_email_key"'), {
    code,
  });

describe('error responses', () => {
  it('answers a thrown NotFoundError with 404 in the shape', async () => {
    const { app } = setup((r) =>
      r.get('/tasks/1', () => {
        throw new NotFoundError('Task not found', 'task_not_found');
      }),
    );

    const res = await request(app).get('/api/v1/tasks/1');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: 'task_not_found',
        message: 'Task not found',
        details: [],
        requestId: res.headers['x-request-id'],
      },
    });
  });

  it('answers a ZodError with 422 and path/message details', async () => {
    const schema = z.object({ title: z.string().min(1), priority: z.enum(['low', 'high']) });
    const { app } = setup((r) =>
      r.post('/tasks', (req) => {
        schema.parse(req.body);
      }),
    );

    const res = await request(app).post('/api/v1/tasks').send({ title: '', priority: 'urgent' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_failed');
    expect(res.body.error.details).toEqual([
      { path: 'title', message: expect.any(String), code: 'too_small' },
      { path: 'priority', message: expect.any(String), code: 'invalid_value' },
    ]);
  });

  it.each([
    ['23505', 409, 'unique_violation'],
    ['23503', 409, 'foreign_key_violation'],
    ['22P02', 400, 'invalid_input'],
  ])('maps pg error %s to %i %s without leaking the pg message', async (code, status, mapped) => {
    const { app } = setup((r) =>
      r.post('/users', () => {
        throw pgError(code);
      }),
    );

    const res = await request(app).post('/api/v1/users');

    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(mapped);
    expect(JSON.stringify(res.body)).not.toContain('users_email_key');
  });

  it('answers an unmatched route with JSON 404 carrying the request id', async () => {
    const { app } = setup(() => {});

    const res = await request(app).get('/api/v1/nope');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });
});

describe('failures that must not leak or hang', () => {
  it('answers a rejected async handler with 500 (Express 5 forwards it — no wrapper needed)', async () => {
    const { app, logs } = setup((r) =>
      r.get('/boom', async () => {
        await Promise.resolve();
        throw new Error('async failure');
      }),
    );

    const res = await request(app).get('/api/v1/boom').timeout(2000);

    expect(res.status).toBe(500);
    const failure = logs().find((entry) => entry.msg === 'request failed');
    expect(failure?.err.stack).toContain('async failure');
  });

  it('keeps stack, SQL and file paths out of a production 500 body', async () => {
    const { app } = setup(
      (r) =>
        r.get('/boom', () => {
          throw new Error('SELECT * FROM users WHERE id = 1 at /app/src/db/pool.ts:12');
        }),
      'production',
    );

    const res = await request(app).get('/api/v1/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'internal_error',
        message: 'Internal server error',
        details: [],
        requestId: expect.any(String),
      },
    });
    const body = JSON.stringify(res.body);
    for (const leak of ['SELECT', 'pool.ts', '/app/src', 'at ']) {
      expect(body).not.toContain(leak);
    }
  });

  it('answers a thrown non-Error with 500', async () => {
    const { app } = setup((r) =>
      r.get('/weird', () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- the case under test
        throw 'a string';
      }),
    );

    const res = await request(app).get('/api/v1/weird');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('internal_error');
  });
});

describe('error logging', () => {
  it('logs a 5xx at error with the stack and a 4xx at warn without one', async () => {
    const { app, logs } = setup((r) => {
      r.get('/missing', () => {
        throw new NotFoundError('Task not found', 'task_not_found');
      });
      r.get('/broken', () => {
        throw new Error('kaput');
      });
    });

    await request(app).get('/api/v1/missing');
    await request(app).get('/api/v1/broken');

    const handled = logs().filter((e) => e.msg === 'Task not found' || e.msg === 'request failed');
    const warn = handled.find((e) => e.msg === 'Task not found');
    const error = handled.find((e) => e.msg === 'request failed');
    expect(warn).toMatchObject({ level: 40, code: 'task_not_found', status: 404 });
    expect(warn?.err).toBeUndefined();
    expect(error).toMatchObject({ level: 50 });
    expect(error?.err.stack).toContain('kaput');
  });
});

describe('process-level failures', () => {
  const fixture = fileURLToPath(new URL('../fixtures/crash.ts', import.meta.url));
  const tsx = import.meta.resolve('tsx');

  it.each([
    ['rejection', 'unhandled promise rejection', 'rejected-on-purpose'],
    ['exception', 'uncaught exception', 'thrown-on-purpose'],
  ])('an unhandled %s is logged fatally and exits 1', (kind, msg, marker) => {
    const result = spawnSync(process.execPath, ['--import', tsx, fixture, kind], {
      env: { ...process.env, LOG_LEVEL: 'info', NODE_ENV: 'test' },
      encoding: 'utf8',
      timeout: 10_000,
    });

    expect(result.status).toBe(1);
    const fatal = result.stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Record<string, any>)
      .find((entry) => entry.level === 60);
    expect(fatal?.msg).toBe(msg);
    expect(fatal?.err.stack).toContain(marker);
  });
});
