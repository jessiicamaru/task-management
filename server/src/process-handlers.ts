import type { Logger } from 'pino';

/**
 * A rejection or exception nobody handled leaves the process in an unknown state. Log it fatally
 * and exit non-zero, so the platform restarts the container instead of it serving requests broken.
 */
export function installProcessHandlers(logger: Logger): void {
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'unhandled promise rejection');
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaught exception');
    process.exit(1);
  });
}
