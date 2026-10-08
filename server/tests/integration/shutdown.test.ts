import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { Agent, request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';

import { Router } from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/config/logger.js';
import { createLifecycle } from '../../src/lifecycle.js';
import { start, type Started } from '../../src/start.js';

function capture() {
  const lines: string[] = [];
  const logger = createLogger({ level: 'info', destination: { write: (l) => lines.push(l) } });
  return { logger, entries: () => lines.map((l) => JSON.parse(l) as Record<string, any>) };
}

const slowRouter = (ms: number) => {
  const router = Router();
  router.get('/slow', (_req, res) => {
    setTimeout(() => res.json({ done: true }), ms);
  });
  return router;
};

let started: Started | undefined;
afterEach(() => {
  started?.dispose();
  started?.server.closeAllConnections();
  started?.server.close();
  started = undefined;
});

async function boot(options: { slowMs?: number; timeoutMs?: number } = {}) {
  const out = capture();
  const exit = vi.fn<(code: number) => void>();
  started = start({
    port: 0,
    logger: out.logger,
    exit,
    timeoutMs: options.timeoutMs ?? 5000,
    apiRouter: slowRouter(options.slowMs ?? 500),
    checkDatabase: () => Promise.resolve(),
  });
  if (!started.server.listening) await once(started.server, 'listening');
  const { port } = started.server.address() as AddressInfo;
  return { ...out, exit, base: `http://127.0.0.1:${port}`, s: started };
}

/** A GET over a keep-alive agent, resolving with status and body. */
function get(url: string, agent?: Agent): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    httpRequest(url, { agent }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    })
      .on('error', reject)
      .end();
  });
}

describe('graceful shutdown', () => {
  it('lets an in-flight request finish, then exits 0', async () => {
    const { exit, base, s } = await boot({ slowMs: 500 });

    const inFlight = get(`${base}/api/v1/slow`);
    await vi.waitFor(() => expect(s.lifecycle.inFlight).toBe(1));
    const done = s.shutdown('SIGTERM');

    const res = await inFlight;
    expect(res).toEqual({ status: 200, body: '{"done":true}' });
    await done;
    expect(exit).toHaveBeenCalledExactlyOnceWith(0);
  });

  it('stops accepting new connections once shutdown starts', async () => {
    const { base, s } = await boot({ slowMs: 300 });
    const inFlight = get(`${base}/api/v1/slow`);
    await vi.waitFor(() => expect(s.lifecycle.inFlight).toBe(1));

    const done = s.shutdown('SIGTERM');
    await expect(get(`${base}/healthz`)).rejects.toThrow();
    await inFlight;
    await done;
  });

  it('shuts an idle server with an open keep-alive connection down in under a second', async () => {
    const { exit, base, s } = await boot();
    const agent = new Agent({ keepAlive: true });
    await get(`${base}/healthz`, agent);

    const started = performance.now();
    await s.shutdown('SIGTERM');

    expect(performance.now() - started).toBeLessThan(1000);
    expect(exit).toHaveBeenCalledWith(0);
    agent.destroy();
  });

  it('exits 1 and logs the outstanding count when the drain outlives the timeout', async () => {
    const { exit, entries, base, s } = await boot({ slowMs: 2000, timeoutMs: 200 });
    const inFlight = get(`${base}/api/v1/slow`).catch(() => undefined);
    await vi.waitFor(() => expect(s.lifecycle.inFlight).toBe(1));

    await s.shutdown('SIGTERM');

    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(entries()).toContainEqual(
      expect.objectContaining({
        msg: 'shutdown timed out with requests still in flight',
        inFlight: 1,
      }),
    );
    s.server.closeAllConnections();
    await inFlight;
  });

  it('ignores a second signal during the drain', async () => {
    const { exit, base, s } = await boot({ slowMs: 300 });
    const inFlight = get(`${base}/api/v1/slow`);
    await vi.waitFor(() => expect(s.lifecycle.inFlight).toBe(1));

    const first = s.shutdown('SIGTERM');
    const second = s.shutdown('SIGTERM');

    expect(second).toBe(first);
    await inFlight;
    await first;
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('starts on SIGTERM delivered to the process', async () => {
    const { exit } = await boot();

    process.emit('SIGTERM', 'SIGTERM');

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
  });
});

describe('readiness while draining', () => {
  it('answers 503 once the drain has begun, while other routes still serve', async () => {
    const lifecycle = createLifecycle();
    const app = createApp({
      logger: createLogger({ level: 'silent' }),
      lifecycle,
      checkDatabase: () => Promise.resolve(),
    });

    expect((await request(app).get('/readyz')).status).toBe(200);
    lifecycle.beginDrain();

    const ready = await request(app).get('/readyz');
    expect(ready.status).toBe(503);
    expect(ready.body).toEqual({ status: 'not_ready', checks: { shutdown: 'draining' } });
    expect((await request(app).get('/healthz')).status).toBe(200);
  });
});

describe.skipIf(process.platform === 'win32')('real SIGTERM', () => {
  it('drains an in-flight request and exits 0', async () => {
    const fixture = fileURLToPath(new URL('../fixtures/serve.ts', import.meta.url));
    const child = spawn(process.execPath, ['--import', import.meta.resolve('tsx'), fixture], {
      env: { ...process.env, LOG_LEVEL: 'info', NODE_ENV: 'test' },
    });
    let stdout = '';
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => (stdout += chunk));

    await vi.waitFor(() => expect(stdout).toContain('API listening'), { timeout: 10_000 });
    const listening = stdout
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Record<string, any>)
      .find((e) => e.msg === 'API listening');
    const inFlight = get(`http://127.0.0.1:${listening?.port}/api/v1/slow`);
    await new Promise((resolve) => setTimeout(resolve, 100));

    child.kill('SIGTERM');

    expect((await inFlight).status).toBe(200);
    const [code] = (await once(child, 'exit')) as [number];
    expect(code).toBe(0);
    expect(stdout).toContain('shutdown complete');
  }, 20_000);
});
