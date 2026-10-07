import { randomUUID } from 'node:crypto';

import type { Logger } from 'pino';
import { pinoHttp, type HttpLogger } from 'pino-http';

export const REQUEST_ID_HEADER = 'x-request-id';

// An incoming id is echoed into every log line and a response header, so it is only trusted when
// it looks like an id: no spaces, no control characters, bounded length.
const VALID_REQUEST_ID = /^[\w.:-]{1,128}$/;

// Probe traffic would otherwise drown the real traffic.
const QUIET_PATHS = new Set(['/healthz', '/readyz']);

/** pino-http configured with request ids, status-based levels and quiet health probes. */
export function requestLogger(logger: Logger): HttpLogger {
  return pinoHttp({
    logger,
    quietReqLogger: true,
    genReqId(req, res) {
      const incoming = req.headers[REQUEST_ID_HEADER];
      const id =
        typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
      res.setHeader(REQUEST_ID_HEADER, id);
      return id;
    },
    customLogLevel(req, res, err) {
      const path = (req.url ?? '').split('?')[0] ?? '';
      if (QUIET_PATHS.has(path)) return 'debug';
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  });
}
