import { logger } from './config/logger.js';
import { closePool, connectWithRetry } from './db/pool.js';
import { installProcessHandlers } from './process-handlers.js';
import { start } from './start.js';

installProcessHandlers(logger);

try {
  await connectWithRetry();
  start({ closers: [closePool] });
} catch (err) {
  logger.fatal({ err }, 'database unavailable after startup retries');
  await new Promise<void>((resolve) => logger.flush(() => resolve()));
  process.exit(1);
}
