import { z } from 'zod';

/**
 * Schemas shared across modules, defined once so `?limit=abc` behaves identically on every
 * endpoint. Module schemas live beside their module (`tasks.schema.ts`) and are exported for the
 * OpenAPI generation (#32).
 */

/**
 * A request body: unknown keys are rejected, not silently dropped — a caller who misspells
 * `priorty` is told, and nobody can smuggle `role: 'owner'` into a body that is later spread into
 * an insert. Forward compatibility comes from API versioning, not from ignoring fields.
 */
export const strictBody = <Shape extends z.ZodRawShape>(shape: Shape) => z.strictObject(shape);

/**
 * Trimmed and lowercased *before* the format check: `z.email().trim()` validates the untrimmed
 * value and rejects "  Ada@Example.COM ".
 */
export const email = z.string().trim().toLowerCase().pipe(z.email());

export const uuidParam = z.object({ id: z.uuid() });

/** `limit` is capped: an uncapped limit is a memory-exhaustion vector on a 512 MB instance. */
export const paginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

/** `?sort=field` ascending or `?sort=-field` descending, over an allowlist of fields. */
export const sortQuery = <const Field extends string>(fields: readonly [Field, ...Field[]]) =>
  z.object({
    sort: z
      .enum([...fields, ...fields.map((f) => `-${f}`)] as [
        Field | `-${Field}`,
        ...(Field | `-${Field}`)[],
      ])
      .optional(),
  });

/** An ISO 8601 timestamp with an offset, e.g. `2026-10-08T09:00:00Z`. */
export const isoDate = z.iso.datetime({ offset: true });
