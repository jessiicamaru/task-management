import { pino, type DestinationStream, type Logger, type LoggerOptions } from 'pino';

import { config } from './index.js';
import { getRequestId } from '../utils/request-context.js';

/**
 * Paths censored in every log line. Non-negotiable: Render's log viewer is shared, retained, and
 * the only window into production. Wildcards cover one and two levels of nesting under any key
 * (`*.password`, `*.*.password`), which reaches `req.body.password` and similar.
 */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  ...['password', 'password_hash', 'token', 'refreshToken', 'accessToken', 'secret'].flatMap(
    (key) => [key, `*.${key}`, `*.*.${key}`],
  ),
  'DATABASE_URL',
  '*.DATABASE_URL',
  'JWT_SECRET',
  '*.JWT_SECRET',
];

/**
 * Builds a logger. `destination` is for tests that capture output; production writes JSON lines
 * to stdout, development pretty-prints.
 */
export interface CreateLoggerOptions {
  level?: string;
  pretty?: boolean;
  destination?: DestinationStream;
}

export function createLogger({
  level = 'info',
  pretty = false,
  destination,
}: CreateLoggerOptions = {}): Logger {
  const options: LoggerOptions = {
    level,
    base: { service: 'task-management' },
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    // Without these an Error logs as {} — no message, no stack.
    serializers: { err: pino.stdSerializers.err, error: pino.stdSerializers.err },
    // Attach the current request id to lines logged outside the request logger (services, repos).
    // The request logger already binds reqId; adding it again would emit the key twice.
    mixin(_object, _level, logger) {
      const reqId = getRequestId();
      return reqId && !('reqId' in logger.bindings()) ? { reqId } : {};
    },
    // No sampling: at free-tier volumes every line is affordable, and a sampled-out line is the
    // one you need.
  };

  if (destination) return pino(options, destination);
  if (pretty) {
    return pino({ ...options, transport: { target: 'pino-pretty', options: { colorize: true } } });
  }
  return pino(options);
}

export const logger = createLogger({
  level: config.log.level,
  pretty: config.env === 'development',
});
