# Research: Request validation

## R1 — `req.query` in Express 5.2

- **Probe**: `req.query = {…}` inside a handler throws `TypeError: Cannot set property query of #<IncomingMessage> which has only a getter` (ESM is strict mode; in sloppy mode it would be silently ignored).
- **Decision**: parsed query and params on `req.validated`; body replaces `req.body` (a plain property). Typed through an Express `Request` augmentation.

## R2 — Trim/lowercase before email validation (zod 4.6)

- **Probe**: `z.email().trim().toLowerCase()` rejects `"  Ada@Example.COM "` — the format check runs on the untrimmed value.
- **Decision**: `z.string().trim().toLowerCase().pipe(z.email())` as the shared `email` schema.

## R3 — Unknown keys

- **Probe**: `z.strictObject` reports `{ code: 'unrecognized_keys', keys: ['priorty'], path: [] }`.
- **Decision**: the #7 mapping expands it to one detail per key with `path: 'priorty'`; `code` is added to every detail.

## R4 — Coercion

- **Decision**: `z.coerce.number().int().min(1).max(100).default(20)` for `limit`; `abc` → NaN → `invalid_type`.
