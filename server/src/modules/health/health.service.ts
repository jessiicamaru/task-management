/** A database round trip; resolves when the database answered, rejects otherwise. */
export type DatabaseCheck = () => Promise<void>;

export interface Liveness {
  status: 'ok';
  uptime: number;
  version: string;
}

export type Readiness =
  | { status: 'ready'; checks: { database: 'ok'; latencyMs: number } }
  | { status: 'not_ready'; checks: { database: 'unreachable' } }
  | { status: 'not_ready'; checks: { shutdown: 'draining' } };

/** Process state only — never the database. A liveness probe that fails when the database is down
 *  makes the platform kill a healthy process for a fault it cannot fix. */
export function liveness(version: string): Liveness {
  return { status: 'ok', uptime: Math.round(process.uptime()), version };
}

/**
 * Whether this instance can serve: one database round trip, bounded so a black-holed connection
 * cannot hang the probe. Not cached — a cached "ready" would hide an outage — and no migration
 * status, which would fail the probe mid-rollout while the old instance must keep serving.
 */
export async function readiness(check: DatabaseCheck, timeoutMs: number): Promise<Readiness> {
  const started = performance.now();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('database check timed out')), timeoutMs);
  });

  try {
    await Promise.race([check(), timeout]);
    return {
      status: 'ready',
      checks: { database: 'ok', latencyMs: Math.round(performance.now() - started) },
    };
  } catch {
    return { status: 'not_ready', checks: { database: 'unreachable' } };
  } finally {
    clearTimeout(timer);
  }
}
