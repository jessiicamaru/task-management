import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * The JWT secret shipped in .env.example. Fine for a laptop, refused in production: a deploy that
 * copied .env.example verbatim must not boot.
 */
export const DEV_JWT_SECRET_PLACEHOLDER = 'dev-only-secret-change-me-at-least-32-chars';

/** The Vite dev server; the default allowed origin outside production. */
export const DEV_CORS_ORIGIN = 'http://localhost:5173';

const DURATION = /^\d+[smhd]$/;
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

// Every message is written here rather than left to zod: default messages for enums and literals
// can echo the received value, and a value must never reach the deploy log.
const required = (what: string) => ({
  error: (issue: { input?: unknown }) =>
    issue.input === undefined ? 'required' : `must be ${what}`,
});

const optionalString = (what: string) => z.string(required(what)).trim().optional();

const integer = (min: number, max: number, what: string) =>
  optionalString(what).pipe(
    z
      .string()
      .regex(/^\d+$/, `must be ${what}`)
      .transform(Number)
      .refine((n) => n >= min && n <= max, `must be ${what}`)
      .optional(),
  );

const boolean = optionalString('true or false').pipe(
  z
    .string()
    .regex(/^(true|false|1|0)$/i, 'must be true or false')
    .transform((v) => v === '1' || v.toLowerCase() === 'true')
    .optional(),
);

const duration = optionalString('a duration like 15m or 7d').pipe(
  z.string().regex(DURATION, 'must be a duration like 15m or 7d').optional(),
);

const rawSchema = z.object({
  NODE_ENV: optionalString('development, test or production').pipe(
    z
      .enum(['development', 'test', 'production'], {
        error: 'must be development, test or production',
      })
      .default('development'),
  ),
  PORT: integer(1, 65535, 'an integer between 1 and 65535').default(3000),
  DATABASE_URL: z
    .string(required('a postgres:// URL'))
    .trim()
    .regex(/^postgres(ql)?:\/\/\S+$/, 'must be a postgres:// URL'),
  DATABASE_SSL: boolean.default(false),
  DB_POOL_MAX: integer(1, 1000, 'an integer between 1 and 1000').default(10),
  JWT_SECRET: z.string(required('a string')).min(1, 'required'),
  JWT_ACCESS_TTL: duration.default('15m'),
  JWT_REFRESH_TTL: duration.default('7d'),
  LOG_LEVEL: optionalString(LOG_LEVELS.join(', ')).pipe(
    z.enum(LOG_LEVELS, { error: `must be one of ${LOG_LEVELS.join(', ')}` }).default('info'),
  ),
  // CORS always runs with credentials, and `Access-Control-Allow-Origin: *` with credentials is
  // invalid per the Fetch spec — browsers reject it silently. Refuse it here, in every environment.
  CORS_ORIGINS: optionalString('a comma-separated list of origins')
    .transform((v) =>
      v === undefined
        ? undefined
        : v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
    )
    .refine(
      (origins) => !origins?.includes('*'),
      'must list explicit origins; * is invalid with credentialed CORS',
    ),
  RATE_LIMIT_WINDOW_MS: integer(1, Number.MAX_SAFE_INTEGER, 'a positive integer').default(60000),
  RATE_LIMIT_MAX: integer(1, Number.MAX_SAFE_INTEGER, 'a positive integer').default(100),
  // How long a SIGTERM drain may take before the process gives up and exits 1. Keep it below the
  // platform's own SIGKILL grace period, or this timer never gets to fire.
  SHUTDOWN_TIMEOUT_MS: integer(1, 600000, 'an integer between 1 and 600000').default(10000),
  // Commit the image was built from (#37 passes it as a build argument). Optional.
  GIT_SHA: optionalString('a git commit SHA').pipe(
    z
      .string()
      .regex(/^[0-9a-f]{7,40}$/i, 'must be a git commit SHA')
      .optional(),
  ),
});

const schema = rawSchema.transform((env) => ({
  ...env,
  CORS_ORIGINS: env.CORS_ORIGINS?.length ? env.CORS_ORIGINS : [DEV_CORS_ORIGIN],
}));

/** A name the schema reads from the environment. */
export type EnvKey = keyof typeof rawSchema.shape;

/** The validated, typed environment. */
export type Env = z.output<typeof schema>;

export type ParseEnvResult = { ok: true; env: Env } | { ok: false; errors: string[] };

type RawEnv = Partial<Record<EnvKey, string>>;

/** The variable names the schema reads, in declaration order. */
export const ENV_KEYS = Object.keys(rawSchema.shape) as EnvKey[];

/**
 * Validates an environment object. Pure: never reads process.env, never exits. Errors are
 * `KEY: reason` lines and never contain a value.
 */
export function parseEnv(source: Readonly<Record<string, string | undefined>>): ParseEnvResult {
  const input: RawEnv = {};
  for (const key of ENV_KEYS) {
    const value = emptyToUndefined(source[key]);
    if (value !== undefined) input[key] = value;
  }
  const result = schema.safeParse(input);
  // Production rules run on the raw input, independently of the schema: zod skips object-level
  // refinements once a field fails, and the report must list every problem at once.
  const errors = [
    ...(result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)),
    ...productionErrors(input),
  ];
  if (result.success && errors.length === 0) return { ok: true, env: result.data };
  return { ok: false, errors: [...new Set(errors)] };
}

function productionErrors({ NODE_ENV, JWT_SECRET, CORS_ORIGINS }: RawEnv): string[] {
  if (NODE_ENV?.trim() !== 'production') return [];
  const errors: string[] = [];

  if (JWT_SECRET !== undefined) {
    if (JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET: must be at least 32 characters in production');
    } else if (JWT_SECRET === DEV_JWT_SECRET_PLACEHOLDER) {
      errors.push('JWT_SECRET: is the .env.example placeholder; set a real secret in production');
    }
  }

  const origins = (CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    errors.push('CORS_ORIGINS: required in production');
  }

  return errors;
}

/**
 * Loads .env outside production, validates process.env, and ends the process with one aggregated
 * report if anything is wrong.
 */
export function loadEnv(): Env {
  // On Render the platform provides the variables; a stray .env in the image must never win.
  if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ quiet: true });
  }

  const result = parseEnv(process.env);
  if (result.ok) return result.env;

  // The logger needs LOG_LEVEL from this very config, so it cannot report its own failure.
  // eslint-disable-next-line no-console -- runs before the logger can exist
  console.error(
    `Invalid environment configuration:\n${result.errors.map((e) => `  - ${e}`).join('\n')}`,
  );
  // eslint-disable-next-line n/no-process-exit -- refusing to boot is the point
  process.exit(1);
}

/**
 * Builds the grouped application config from a validated environment. Pure; `config` in
 * index.ts is the instance the rest of the code imports.
 */
export function buildConfig(env: Env): Config {
  return deepFreeze({
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    http: {
      port: env.PORT,
      corsOrigins: env.CORS_ORIGINS,
    },
    db: {
      url: env.DATABASE_URL,
      ssl: env.DATABASE_SSL,
      poolMax: env.DB_POOL_MAX,
    },
    jwt: {
      secret: env.JWT_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshTtl: env.JWT_REFRESH_TTL,
    },
    log: {
      level: env.LOG_LEVEL,
    },
    rateLimit: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
    },
    shutdown: {
      timeoutMs: env.SHUTDOWN_TIMEOUT_MS,
    },
    build: {
      gitSha: env.GIT_SHA ?? null,
    },
  });
}

/** The grouped application config. Deeply read-only at the type level and frozen at runtime. */
export type Config = DeepReadonly<{
  env: Env['NODE_ENV'];
  isProduction: boolean;
  isTest: boolean;
  http: { port: number; corsOrigins: string[] };
  db: { url: string; ssl: boolean; poolMax: number };
  jwt: { secret: string; accessTtl: string; refreshTtl: string };
  log: { level: Env['LOG_LEVEL'] };
  rateLimit: { windowMs: number; max: number };
  shutdown: { timeoutMs: number };
  build: { gitSha: string | null };
}>;

type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

function emptyToUndefined(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === '' ? undefined : value;
}

function deepFreeze<T extends object>(value: T): DeepReadonly<T> {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') deepFreeze(child);
  }
  return Object.freeze(value);
}
