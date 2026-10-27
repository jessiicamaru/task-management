import type { PoolClient } from 'pg';

import { pool } from './pool.js';

export type IsolationLevel = 'read committed' | 'repeatable read' | 'serializable';

export interface TransactionOptions {
  isolation?: IsolationLevel;
  /** Retries PostgreSQL serialization failures (SQLSTATE 40001), at most three attempts. */
  retryOnSerializationFailure?: boolean;
}

type Work<T> = (client: PoolClient) => Promise<T>;

const beginStatement = (isolation?: IsolationLevel): string =>
  isolation ? `BEGIN ISOLATION LEVEL ${isolation.toUpperCase()}` : 'BEGIN';

const isSerializationFailure = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === '40001';

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Runs one atomic unit of work and releases its checked-out client on every path.
 * Repository functions called by `work` must use this client rather than the global pool.
 */
export async function withTransaction<T>(
  work: Work<T>,
  options: TransactionOptions = {},
): Promise<T> {
  const attempts = options.retryOnSerializationFailure ? 3 : 1;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const client = await pool.connect();
    try {
      await client.query(beginStatement(options.isolation));
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      // A broken connection can make ROLLBACK fail. Never replace the business error with it.
      await client.query('ROLLBACK').catch(() => undefined);
      if (attempt < attempts && isSerializationFailure(err)) {
        await delay(25 * 2 ** (attempt - 1));
        continue;
      }
      throw err;
    } finally {
      client.release();
    }
  }

  throw new Error('transaction retry loop exhausted');
}
