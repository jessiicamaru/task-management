import type { Server } from 'node:http';

import type { Logger } from 'pino';

import type { Lifecycle } from './lifecycle.js';

/** Releases a resource on shutdown, after the last request has finished (the pool, #10). */
export type Closer = () => Promise<void>;

export interface ShutdownOptions {
  server: Server;
  lifecycle: Lifecycle;
  logger: Logger;
  timeoutMs: number;
  closers?: Closer[];
  exit?: (code: number) => void;
}

/**
 * Builds the shutdown sequence. Calling the returned function a second time — a second SIGTERM
 * during the drain — returns the same promise instead of starting another sequence.
 *
 *   1. readiness answers 503, so the load balancer stops sending new traffic;
 *   2. the listener closes and idle keep-alive sockets are dropped;
 *   3. in-flight requests finish (bounded by the hard timer);
 *   4. resources close (the pool, once #10 lands);
 *   5. logs flush, exit 0.
 *
 * If that has not happened within `timeoutMs`, the outstanding count is logged and the process
 * exits 1 — a shutdown that hangs gets SIGKILLed by the platform with no log at all.
 */
export function createShutdown({
  server,
  lifecycle,
  logger,
  timeoutMs,
  closers = [],
  exit = (code) => process.exit(code),
}: ShutdownOptions): (signal: string) => Promise<void> {
  let running: Promise<void> | undefined;

  const run = async (signal: string): Promise<void> => {
    let timer: NodeJS.Timeout | undefined;
    const deadline = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), timeoutMs);
    });

    logger.info({ signal, inFlight: lifecycle.inFlight, timeoutMs }, 'shutdown started');
    lifecycle.beginDrain();
    const closed = new Promise<void>((resolve) => server.close(() => resolve()));
    // A keep-alive socket with no request on it would otherwise hold the drain open for its whole
    // idle timeout.
    server.closeIdleConnections();

    const drain = (async () => {
      await lifecycle.idle();
      // Every request has finished, so every remaining socket is idle.
      server.closeAllConnections();
      await closed;
      for (const close of closers) await close();
      return 'drained' as const;
    })();
    // If the deadline wins, a later failure of the drain must not become an unhandled rejection.
    drain.catch(() => undefined);

    let code: number;
    try {
      if ((await Promise.race([drain, deadline])) === 'timeout') {
        logger.error(
          { signal, inFlight: lifecycle.inFlight, timeoutMs },
          'shutdown timed out with requests still in flight',
        );
        code = 1;
      } else {
        logger.info({ signal }, 'shutdown complete');
        code = 0;
      }
    } catch (err) {
      logger.error({ err, signal }, 'shutdown failed');
      code = 1;
    } finally {
      clearTimeout(timer);
    }

    await new Promise<void>((resolve) => logger.flush(() => resolve()));
    exit(code);
  };

  return (signal) => {
    if (running) {
      logger.warn({ signal }, 'shutdown already in progress; ignoring signal');
      return running;
    }
    running = run(signal);
    return running;
  };
}
