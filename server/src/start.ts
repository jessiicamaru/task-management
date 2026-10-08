import type { Server } from 'node:http';

import type { Logger } from 'pino';

import { createApp, type CreateAppOptions } from './app.js';
import { config } from './config/index.js';
import { logger as defaultLogger } from './config/logger.js';
import { createLifecycle, type Lifecycle } from './lifecycle.js';
import { createShutdown, type Closer } from './shutdown.js';
import { describeDatabaseUrl } from './utils/database-url.js';

// Above the 60 s idle timeout common to load balancers, so the proxy — not Node — closes an idle
// keep-alive connection. If Node closed it first, a request the proxy sends at that instant fails
// with a 502. headersTimeout must exceed keepAliveTimeout.
const KEEP_ALIVE_TIMEOUT_MS = 65_000;
const HEADERS_TIMEOUT_MS = 66_000;

export interface StartOptions extends Pick<CreateAppOptions, 'apiRouter' | 'checkDatabase'> {
  port?: number;
  logger?: Logger;
  timeoutMs?: number;
  closers?: Closer[];
  exit?: (code: number) => void;
}

export interface Started {
  server: Server;
  lifecycle: Lifecycle;
  shutdown: (signal: string) => Promise<void>;
  /** Removes the signal handlers (tests). */
  dispose: () => void;
}

/** Starts the API: listener, keep-alive timeouts, SIGTERM/SIGINT drain. */
export function start({
  port = config.http.port,
  logger = defaultLogger,
  timeoutMs = config.shutdown.timeoutMs,
  closers = [],
  exit,
  ...appOptions
}: StartOptions = {}): Started {
  const lifecycle = createLifecycle();
  const app = createApp({ ...appOptions, logger, lifecycle });

  // Express 5 calls the listen callback on failure too, passing the error (e.g. EADDRINUSE).
  const server = app.listen(port, (err) => {
    if (err) {
      logger.fatal({ err, port }, 'failed to start API');
      (exit ?? ((code: number) => process.exit(code)))(1);
      return;
    }
    const bound = server.address();
    logger.info(
      {
        address: typeof bound === 'object' && bound ? bound.address : bound,
        port: typeof bound === 'object' && bound ? bound.port : port,
        env: config.env,
        logLevel: config.log.level,
        database: describeDatabaseUrl(config.db.url),
      },
      'API listening',
    );
  });
  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
  server.headersTimeout = HEADERS_TIMEOUT_MS;

  const shutdown = createShutdown({
    server,
    lifecycle,
    logger,
    timeoutMs,
    closers,
    ...(exit ? { exit } : {}),
  });

  const onSignal = (signal: NodeJS.Signals) => void shutdown(signal);
  process.on('SIGTERM', onSignal);
  process.on('SIGINT', onSignal);

  return {
    server,
    lifecycle,
    shutdown,
    dispose: () => {
      process.off('SIGTERM', onSignal);
      process.off('SIGINT', onSignal);
    },
  };
}
