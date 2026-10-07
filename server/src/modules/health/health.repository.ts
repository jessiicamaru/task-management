import pg from 'pg';

export interface DatabaseTarget {
  url: string;
  ssl: boolean;
  timeoutMs: number;
}

/**
 * One round trip to the database. Until the shared pool lands (#10) this opens a short-lived
 * client per probe; #10 replaces it with `pool.query('SELECT 1')` through the same injection point
 * in createApp.
 */
export async function pingDatabase({ url, ssl, timeoutMs }: DatabaseTarget): Promise<void> {
  const client = new pg.Client({
    connectionString: url,
    ssl: ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: timeoutMs,
    query_timeout: timeoutMs,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
  } finally {
    await client.end().catch(() => undefined);
  }
}
