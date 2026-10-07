import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';

import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { buildConfig } from '../../src/config/env.js';
import { createLogger } from '../../src/config/logger.js';
import { validEnv } from '../helpers/env.js';

const { version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

const logger = createLogger({ level: 'silent' });

function configWith(extra: Record<string, string> = {}) {
  return buildConfig(
    validEnv({
      DATABASE_URL: 'postgres://u:p@127.0.0.1:1/app',
      JWT_SECRET: 'test-secret',
      ...extra,
    }),
  );
}

/** A port nothing listens on: bind an ephemeral port, then release it. */
async function closedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

describe('GET /healthz', () => {
  it('answers 200 with status, uptime and the package version, without touching the database', async () => {
    const checkDatabase = vi.fn(() => Promise.reject(new Error('database is down')));
    const app = createApp({ logger, config: configWith(), checkDatabase });

    // One warm-up request on a long-lived server, so the timing below is the handler, not the
    // test harness opening a socket.
    const server = app.listen(0);
    await request(server).get('/healthz');
    const started = performance.now();
    const res = await request(server).get('/healthz');
    const elapsed = performance.now() - started;
    server.close();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', uptime: expect.any(Number), version });
    expect(checkDatabase).not.toHaveBeenCalled();
    expect(elapsed).toBeLessThan(50);
  });

  it('reports the short commit when the build set GIT_SHA', async () => {
    const app = createApp({
      logger,
      config: configWith({ GIT_SHA: 'abc1234def5678' }),
      checkDatabase: () => Promise.resolve(),
    });

    const res = await request(app).get('/healthz');

    expect(res.body.version).toBe(`${version}+abc1234`);
  });

  it('needs no credentials', async () => {
    const app = createApp({ logger, config: configWith(), checkDatabase: () => Promise.resolve() });

    const res = await request(app).get('/healthz');

    expect(res.status).toBe(200);
  });
});

describe('GET /readyz', () => {
  it('answers 200 with latency when the database answers', async () => {
    const app = createApp({ logger, config: configWith(), checkDatabase: () => Promise.resolve() });

    const res = await request(app).get('/readyz');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ready',
      checks: { database: 'ok', latencyMs: expect.any(Number) },
    });
  });

  it('answers 503 when the database check fails', async () => {
    const app = createApp({
      logger,
      config: configWith(),
      checkDatabase: () => Promise.reject(new Error('ECONNREFUSED')),
    });

    const res = await request(app).get('/readyz');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'not_ready', checks: { database: 'unreachable' } });
  });

  it('answers 503 within the timeout when the database check hangs', async () => {
    const app = createApp({
      logger,
      config: configWith(),
      checkDatabase: () => new Promise<void>(() => {}),
    });

    const started = performance.now();
    const res = await request(app).get('/readyz');

    expect(res.status).toBe(503);
    expect(performance.now() - started).toBeLessThan(2500);
  });

  it('answers 503 against a real address with no database behind it', async () => {
    const port = await closedPort();
    // The default check: a real pg client against a closed port.
    const app = createApp({
      logger,
      config: configWith({ DATABASE_URL: `postgres://u:p@127.0.0.1:${port}/app` }),
    });

    const res = await request(app).get('/readyz');

    expect(res.status).toBe(503);
    expect(res.body.checks.database).toBe('unreachable');
  });
});
