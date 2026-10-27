import pg, { type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

// SECURITY: SQL values must always be passed as $1, $2 parameters. Never interpolate values into
// a SQL template literal. Identifiers must come from a closed, code-owned allowlist.

export const pool = new pg.Pool({
  connectionString: config.db.url,
  // Render's same-region managed PostgreSQL requires TLS but its certificate does not validate
  // against the container's system store. This follows Render's documented connection setting.
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  max: config.db.poolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 10_000,
  query_timeout: 10_000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'unexpected error from an idle PostgreSQL client');
});

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  connect?: () => Promise<Pick<PoolClient, 'release'>>;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
}

/** Connects at boot with capped exponential backoff and full jitter. */
export async function connectWithRetry({
  attempts = 10,
  baseDelayMs = 250,
  maxDelayMs = 8_000,
  connect = () => pool.connect(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  random = Math.random,
}: RetryOptions = {}): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const client = await connect();
      client.release();
      logger.info({ attempt }, 'PostgreSQL connection established');
      return;
    } catch (err) {
      lastError = err;
      if (attempt === attempts) break;
      const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const delayMs = Math.max(1, Math.round(ceiling * random()));
      logger.warn({ err, attempt, attempts, delayMs }, 'PostgreSQL connection failed; retrying');
      await sleep(delayMs);
    }
  }

  throw lastError;
}

/** Runs a parameterized query and records timing without ever logging SQL values. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const started = performance.now();
  let rowCount: number | null = null;
  try {
    const result = await pool.query<T>(text, params);
    rowCount = result.rowCount;
    return result;
  } finally {
    const durationMs = Math.round(performance.now() - started);
    const fields = { durationMs, rowCount, parameterCount: params.length };
    if (durationMs >= config.db.slowQueryMs) {
      logger.warn(fields, 'slow PostgreSQL query');
    } else {
      logger.debug(fields, 'PostgreSQL query complete');
    }
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
