// Values parsed by the validate() middleware. Express 5's `req.query` is a getter and cannot be
// reassigned, so the parsed query (and params, for symmetry) live here; the parsed body replaces
// `req.body` directly.
declare global {
  namespace Express {
    interface Request {
      validated: {
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
