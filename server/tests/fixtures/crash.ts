// Spawned by tests/integration/process-handlers.test.ts: installs the real handlers, then fails
// the way the first argument says.
import { createLogger } from '../../src/config/logger.js';
import { installProcessHandlers } from '../../src/process-handlers.js';

installProcessHandlers(createLogger({ level: 'info' }));

if (process.argv[2] === 'rejection') {
  void Promise.reject(new Error('rejected-on-purpose'));
} else {
  setTimeout(() => {
    throw new Error('thrown-on-purpose');
  }, 0);
}
