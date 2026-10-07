import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  buildConfig,
  DEV_JWT_SECRET_PLACEHOLDER,
  ENV_KEYS,
  parseEnv,
} from '../../src/config/env.js';

const minimal = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/app',
  JWT_SECRET: 'a-local-secret',
};

const production = {
  ...minimal,
  NODE_ENV: 'production',
  JWT_SECRET: 'p'.repeat(48),
  CORS_ORIGINS: 'https://app.example.com',
};

const errorsFor = (env) => {
  const result = parseEnv(env);
  expect(result.ok).toBe(false);
  return result.errors;
};

describe('parseEnv', () => {
  it('applies defaults to a minimal environment', () => {
    const result = parseEnv(minimal);

    expect(result).toEqual({
      ok: true,
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        DATABASE_URL: minimal.DATABASE_URL,
        DATABASE_SSL: false,
        DB_POOL_MAX: 10,
        JWT_SECRET: minimal.JWT_SECRET,
        JWT_ACCESS_TTL: '15m',
        JWT_REFRESH_TTL: '7d',
        LOG_LEVEL: 'info',
        CORS_ORIGINS: ['http://localhost:5173'],
        RATE_LIMIT_WINDOW_MS: 60000,
        RATE_LIMIT_MAX: 100,
      },
    });
  });

  it('reports a missing JWT_SECRET as required', () => {
    expect(errorsFor({ DATABASE_URL: minimal.DATABASE_URL })).toEqual(['JWT_SECRET: required']);
  });

  it('treats an empty value as missing', () => {
    expect(errorsFor({ ...minimal, JWT_SECRET: '   ' })).toEqual(['JWT_SECRET: required']);
  });

  it('aggregates every failure, including production rules, into one report', () => {
    const errors = errorsFor({
      NODE_ENV: 'production',
      PORT: 'eighty',
      DATABASE_URL: 'mysql://localhost/app',
      JWT_SECRET: 'short',
      CORS_ORIGINS: '*',
      LOG_LEVEL: 'loud',
    });

    expect(errors).toEqual([
      'PORT: must be an integer between 1 and 65535',
      'DATABASE_URL: must be a postgres:// URL',
      'LOG_LEVEL: must be one of fatal, error, warn, info, debug, trace, silent',
      'CORS_ORIGINS: must list explicit origins; * is invalid with credentialed CORS',
      'JWT_SECRET: must be at least 32 characters in production',
    ]);
  });

  it('never includes a supplied value in an error', () => {
    const secret = 'super-secret-value';
    const errors = errorsFor({
      NODE_ENV: 'production',
      DATABASE_URL: 'mysql://admin:hunter2@db/app',
      JWT_SECRET: secret,
      LOG_LEVEL: 'verbose-xyz',
      PORT: '99999',
      CORS_ORIGINS: '*',
    }).join('\n');

    for (const value of [secret, 'hunter2', 'verbose-xyz', '99999']) {
      expect(errors).not.toContain(value);
    }
  });

  it('refuses the .env.example placeholder secret in production', () => {
    expect(errorsFor({ ...production, JWT_SECRET: DEV_JWT_SECRET_PLACEHOLDER })).toEqual([
      'JWT_SECRET: is the .env.example placeholder; set a real secret in production',
    ]);
  });

  it('refuses * as a CORS origin in every environment', () => {
    expect(errorsFor({ ...minimal, CORS_ORIGINS: 'http://localhost:5173, *' })).toEqual([
      'CORS_ORIGINS: must list explicit origins; * is invalid with credentialed CORS',
    ]);
  });

  it('requires explicit CORS origins in production', () => {
    const withoutCors = { ...production };
    delete withoutCors.CORS_ORIGINS;

    expect(errorsFor(withoutCors)).toEqual(['CORS_ORIGINS: required in production']);
  });

  it('accepts a valid production environment and splits CORS origins', () => {
    const result = parseEnv({
      ...production,
      CORS_ORIGINS: ' https://a.example , https://b.example,',
    });

    expect(result.ok).toBe(true);
    expect(result.env.CORS_ORIGINS).toEqual(['https://a.example', 'https://b.example']);
  });

  it.each([
    ['false', false],
    ['FALSE', false],
    ['0', false],
    ['true', true],
    ['1', true],
  ])('parses DATABASE_SSL=%s as %s', (raw, expected) => {
    expect(parseEnv({ ...minimal, DATABASE_SSL: raw }).env.DATABASE_SSL).toBe(expected);
  });

  it('rejects a TTL given as a bare number', () => {
    expect(errorsFor({ ...minimal, JWT_ACCESS_TTL: '15' })).toEqual([
      'JWT_ACCESS_TTL: must be a duration like 15m or 7d',
    ]);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(errorsFor({ ...minimal, NODE_ENV: 'staging' })).toEqual([
      'NODE_ENV: must be development, test or production',
    ]);
  });
});

describe('buildConfig', () => {
  it('groups and deep-freezes the configuration', () => {
    const config = buildConfig(parseEnv({ ...minimal, PORT: '4000' }).env);

    expect(config.http.port).toBe(4000);
    expect(config.db.url).toBe(minimal.DATABASE_URL);
    expect(config.isProduction).toBe(false);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.http.corsOrigins)).toBe(true);
    expect(() => {
      config.jwt.secret = 'changed';
    }).toThrow(TypeError);
  });
});

describe('.env.example', () => {
  const example = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8');
  const keys = new Map(
    example
      .split('\n')
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => line.split(/=(.*)/s).slice(0, 2)),
  );

  it('documents every variable the schema reads', () => {
    expect([...keys.keys()].sort()).toEqual([...ENV_KEYS].sort());
  });

  it('carries the placeholder secret that production refuses', () => {
    expect(keys.get('JWT_SECRET')).toBe(DEV_JWT_SECRET_PLACEHOLDER);
  });

  it('is itself a valid development environment', () => {
    expect(parseEnv(Object.fromEntries(keys)).ok).toBe(true);
  });
});
