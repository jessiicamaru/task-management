import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './config/logger.js';
import { describeDatabaseUrl } from './utils/database-url.js';

const { port } = config.http;

// Express 5 calls the listen callback on failure too, passing the error (e.g. EADDRINUSE).
const server = createApp().listen(port, (err) => {
  if (err) {
    logger.fatal({ err, port }, 'failed to start API');
    process.exit(1);
  }
  const bound = server.address();
  const address = typeof bound === 'object' && bound ? bound.address : bound;
  logger.info(
    {
      address,
      port,
      env: config.env,
      logLevel: config.log.level,
      database: describeDatabaseUrl(config.db.url),
    },
    'API listening',
  );
});
