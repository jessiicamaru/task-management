import type { NextFunction, Request, Response } from 'express';
import { ZodError, type z } from 'zod';

export interface ValidationSchemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

/**
 * Parses the parts of a request that have a schema and hands the *parsed* values to the handler:
 * coercion (`"5"` → 5), trimming and defaults only help if the handler sees the result.
 *
 * - body   → replaces `req.body`
 * - query  → `req.validated.query` (Express 5's `req.query` is a getter; assigning to it throws)
 * - params → `req.validated.params`
 *
 * Failures from every part are thrown together as one ZodError, with paths prefixed by the part
 * (`body.title`, `query.limit`). Formatting the 422 is the error handler's job, not this one's.
 *
 * Read the parsed values with the schema's type: `req.validated.query as z.output<typeof q>`.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const issues: z.core.$ZodIssue[] = [];
    const parsed: Partial<Record<keyof ValidationSchemas, unknown>> = {};

    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (result.success) {
        parsed[part] = result.data;
      } else {
        issues.push(
          ...result.error.issues.map((issue) => ({ ...issue, path: [part, ...issue.path] })),
        );
      }
    }

    if (issues.length > 0) throw new ZodError(issues);

    if (schemas.body) req.body = parsed.body;
    req.validated = {
      ...req.validated,
      ...(schemas.query ? { query: parsed.query } : {}),
      ...(schemas.params ? { params: parsed.params } : {}),
    };
    next();
  };
}
