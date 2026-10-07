import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

const serverEntry = fileURLToPath(new URL('../../src/server.js', import.meta.url));
// An empty working directory, so no developer .env is picked up by dotenv.
const cwd = mkdtempSync(join(tmpdir(), 'config-boot-'));

function boot(env) {
  return spawnSync(process.execPath, [serverEntry], {
    cwd,
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...env },
    encoding: 'utf8',
    timeout: 10_000,
  });
}

describe('boot with an invalid environment', () => {
  afterAll(() => rmSync(cwd, { recursive: true, force: true }));

  it('exits non-zero and names JWT_SECRET when it is unset', () => {
    const result = boot({ DATABASE_URL: 'postgres://u:p@localhost/app' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('JWT_SECRET: required');
  });

  it('refuses CORS_ORIGINS=* at startup with the reason', () => {
    const result = boot({
      DATABASE_URL: 'postgres://u:p@localhost/app',
      JWT_SECRET: 'a-local-secret',
      CORS_ORIGINS: '*',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'CORS_ORIGINS: must list explicit origins; * is invalid with credentialed CORS',
    );
  });

  it('refuses a short secret in production without printing it', () => {
    const secret = 'short-secret-value';
    const result = boot({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://u:p@localhost/app',
      JWT_SECRET: secret,
      CORS_ORIGINS: 'https://app.example.com',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('JWT_SECRET: must be at least 32 characters in production');
    expect(result.stdout + result.stderr).not.toContain(secret);
  });
});
