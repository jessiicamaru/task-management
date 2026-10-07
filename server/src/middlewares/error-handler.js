/**
 * The project's error response shape (#7):
 *
 *   { "error": { "code": "...", "message": "...", "details": [], "requestId": "..." } }
 *
 * This is the minimal handler the app bootstrap needs; #7 extends it with AppError, zod and pg
 * error mapping and the 4xx/5xx logging rules.
 */
export function errorBody(req, code, message, details = []) {
  return { error: { code, message, details, requestId: req.id } };
}

/** Unmatched routes answer in the error shape, not Express's HTML default. */
export function notFound(req, res) {
  res.status(404).json(errorBody(req, 'not_found', `Route ${req.method} ${req.path} not found`));
}

// body-parser errors carry a 4xx `status` and a `type`; map the ones a client can cause.
const CLIENT_ERROR_CODES = {
  'entity.too.large': ['payload_too_large', 'Request body is too large'],
  'entity.parse.failed': ['invalid_json', 'Request body is not valid JSON'],
  'encoding.unsupported': ['unsupported_encoding', 'Request body encoding is not supported'],
  'charset.unsupported': ['unsupported_charset', 'Request body charset is not supported'],
};

// Express requires the four-argument signature to recognise an error handler.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status ?? err.statusCode;

  if (Number.isInteger(status) && status >= 400 && status < 500) {
    const [code, message] = CLIENT_ERROR_CODES[err.type] ?? ['bad_request', 'Bad request'];
    res.status(status).json(errorBody(req, code, message));
    return;
  }

  // Nothing from the original error reaches the client; the log has the stack.
  req.log.error({ err }, 'unhandled error');
  res.status(500).json(errorBody(req, 'internal_error', 'Internal server error'));
}
