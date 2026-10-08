import { Router, type Request, type Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/config/logger.js';
import { validate } from '../../src/middlewares/validate.js';
import { email, paginationQuery, strictBody, uuidParam } from '../../src/utils/schemas.js';

const createTask = strictBody({
  title: z.string().trim().min(1),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});
const register = strictBody({ email, password: z.string().min(8) });

const echo = (req: Request, res: Response) => {
  res.json({ body: req.body as unknown, query: req.validated.query, params: req.validated.params });
};

function app() {
  const router = Router();
  router.post('/tasks', validate({ body: createTask }), echo);
  router.post('/auth/register', validate({ body: register }), echo);
  router.get('/tasks', validate({ query: paginationQuery }), echo);
  router.get('/projects', validate({ query: paginationQuery }), echo);
  router.get('/comments', validate({ query: paginationQuery }), echo);
  router.get('/tasks/:id', validate({ params: uuidParam }), echo);
  return createApp({ logger: createLogger({ level: 'silent' }), apiRouter: router });
}

describe('validate()', () => {
  it('rejects a body missing a required field, naming its path', async () => {
    const res = await request(app()).post('/api/v1/tasks').send({ priority: 'high' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('validation_failed');
    expect(res.body.error.details).toEqual([
      { path: 'body.title', message: expect.any(String), code: 'invalid_type' },
    ]);
  });

  it('rejects an unknown body key, naming the key', async () => {
    const res = await request(app()).post('/api/v1/tasks').send({ title: 'x', priorty: 'high' });

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([
      { path: 'body.priorty', message: 'Unknown field "priorty"', code: 'unrecognized_keys' },
    ]);
  });

  it.each(['abc', '99999', '0'])('rejects ?limit=%s with 422', async (limit) => {
    const res = await request(app()).get(`/api/v1/tasks?limit=${limit}`);

    expect(res.status).toBe(422);
    expect(res.body.error.details[0].path).toBe('query.limit');
  });

  it('hands the handler the parsed query: ?limit=5 is the number 5, absent is 20', async () => {
    const five = await request(app()).get('/api/v1/tasks?limit=5');
    const absent = await request(app()).get('/api/v1/tasks');

    expect(five.status).toBe(200);
    expect(five.body.query).toEqual({ limit: 5 });
    expect(absent.body.query).toEqual({ limit: 20 });
  });

  it('replaces req.body with the parsed value: email trimmed and lowercased, defaults applied', async () => {
    const reg = await request(app())
      .post('/api/v1/auth/register')
      .send({ email: '  Ada@Example.COM ', password: 'correct horse' });
    const task = await request(app()).post('/api/v1/tasks').send({ title: '  Write docs  ' });

    expect(reg.status).toBe(200);
    expect(reg.body.body.email).toBe('ada@example.com');
    expect(task.body.body).toEqual({ title: 'Write docs', priority: 'medium' });
  });

  it('rejects a non-UUID route parameter', async () => {
    const res = await request(app()).get('/api/v1/tasks/42');

    expect(res.status).toBe(422);
    expect(res.body.error.details[0]).toMatchObject({ path: 'params.id', code: 'invalid_format' });
  });

  it('produces the identical error on three different endpoints', async () => {
    const bodies = await Promise.all(
      ['/api/v1/tasks', '/api/v1/projects', '/api/v1/comments'].map(async (path) => {
        const res = await request(app()).get(`${path}?limit=abc`);
        expect(res.status).toBe(422);
        const { requestId: _id, ...rest } = res.body.error;
        return rest as unknown;
      }),
    );

    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
  });
});
