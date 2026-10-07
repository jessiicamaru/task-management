import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/config/logger.js';
import { requestLogger } from '../../src/middlewares/request-logger.js';
import { getRequestId, requestContext } from '../../src/utils/request-context.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function capture(level = 'info') {
  const lines = [];
  const logger = createLogger({ level, destination: { write: (line) => lines.push(line) } });
  return {
    logger,
    raw: () => lines.join(''),
    entries: () => lines.map((line) => JSON.parse(line)),
  };
}

describe('request logging', () => {
  it('uses an incoming x-request-id in the log and echoes it back', async () => {
    const out = capture();

    const res = await request(createApp({ logger: out.logger }))
      .get('/')
      .set('x-request-id', 'abc');

    expect(res.headers['x-request-id']).toBe('abc');
    expect(out.raw()).toContain('"reqId":"abc"');
  });

  it('generates a UUID when no id is sent, and uses it in both places', async () => {
    const out = capture();

    const res = await request(createApp({ logger: out.logger })).get('/');

    const id = res.headers['x-request-id'];
    expect(id).toMatch(UUID_V4);
    expect(out.entries().some((entry) => entry.reqId === id)).toBe(true);
  });

  it('replaces an incoming id that does not look like an id', async () => {
    const out = capture();

    const res = await request(createApp({ logger: out.logger }))
      .get('/')
      .set('x-request-id', 'a b\tc');

    expect(res.headers['x-request-id']).toMatch(UUID_V4);
  });

  it('logs no password or token from a login request', async () => {
    const out = capture('trace');

    await request(createApp({ logger: out.logger }))
      .post('/api/v1/auth/login')
      .set('authorization', 'Bearer header-token-value')
      .set('cookie', 'refreshToken=cookie-token-value')
      .send({ email: 'ada@example.com', password: 'correct horse battery staple' });

    const output = out.raw();
    expect(output).not.toContain('correct horse battery staple');
    expect(output).not.toContain('header-token-value');
    expect(output).not.toContain('cookie-token-value');
  });

  it('logs 4xx at warn and 2xx at info', async () => {
    const out = capture();
    const app = createApp({ logger: out.logger });

    await request(app).get('/');
    await request(app).get('/missing');

    const levels = out.entries().map((entry) => [entry.req?.url, entry.level]);
    expect(levels).toContainEqual(['/', 30]);
    expect(levels).toContainEqual(['/missing', 40]);
  });

  it('logs health probes only at debug', async () => {
    const atInfo = capture('info');
    const atDebug = capture('debug');

    await request(createApp({ logger: atInfo.logger })).get('/healthz');
    await request(createApp({ logger: atDebug.logger })).get('/healthz');

    expect(atInfo.raw()).not.toContain('/healthz');
    expect(atDebug.raw()).toContain('/healthz');
  });
});

describe('logger', () => {
  it('serialises an Error with its message and stack', () => {
    const out = capture();

    out.logger.error({ err: new Error('boom') }, 'failed');

    const [entry] = out.entries();
    expect(entry.err.message).toBe('boom');
    expect(entry.err.stack).toContain('Error: boom');
  });

  it('redacts nested credentials and configuration secrets', () => {
    const out = capture();

    out.logger.info({
      user: { password: 'p1', password_hash: 'h1' },
      body: { auth: { refreshToken: 'r1', accessToken: 'a1' } },
      DATABASE_URL: 'postgres://u:dbpass@h/db',
      jwt: { secret: 's1' },
    });

    const output = out.raw();
    for (const value of ['p1', 'h1', 'r1', 'a1', 'dbpass', 's1']) {
      expect(output).not.toContain(`"${value}"`);
    }
    expect(output).not.toContain('dbpass');
    expect(output).toContain('[REDACTED]');
  });

  it('tags lines logged inside a request with that request id', async () => {
    const out = capture();
    // createApp ends with the 404 fallback, so a probe route goes on a minimal app built from the
    // same two middlewares.
    const app = express();
    app.use(requestLogger(out.logger));
    app.use(requestContext);
    app.get('/deep', (req, res) => {
      // A service would log through the shared logger, without access to req.
      out.logger.info({ seen: getRequestId() }, 'from a service');
      res.sendStatus(204);
    });

    await request(app).get('/deep').set('x-request-id', 'deep-1');

    const serviceLine = out.entries().find((entry) => entry.msg === 'from a service');
    expect(serviceLine).toMatchObject({ reqId: 'deep-1', seen: 'deep-1' });
  });

  it('never emits reqId twice on request-logger lines', async () => {
    const out = capture();

    await request(createApp({ logger: out.logger }))
      .get('/')
      .set('x-request-id', 'once');

    for (const line of out.raw().trim().split('\n')) {
      expect(line.match(/"reqId"/g)?.length ?? 0).toBeLessThanOrEqual(1);
    }
  });
});
