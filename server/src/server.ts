import { logger } from './config/logger.js';
import { installProcessHandlers } from './process-handlers.js';
import { start } from './start.js';

installProcessHandlers(logger);
start();
