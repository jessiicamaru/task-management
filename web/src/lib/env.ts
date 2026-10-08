import { z } from 'zod';

/**
 * The app's configuration, validated once at startup — the same discipline as the server (#4).
 *
 * VITE_* variables are inlined into the bundle at BUILD time and are PUBLIC: anyone can read them
 * in the browser's dev tools. Never put a secret here. A value also cannot change without a
 * rebuild, which is why the Render static site sets VITE_API_URL as a build-time variable (#66).
 */
const schema = z.object({
  VITE_API_URL: z.url({
    error: (issue) =>
      issue.input === undefined || issue.input === ''
        ? 'required'
        : 'must be an absolute URL, e.g. http://localhost:3000',
  }),
});

export type Env = z.output<typeof schema>;

export type ParseEnvResult = { ok: true; env: Env } | { ok: false; errors: string[] };

/** Validates an environment record. Errors are `KEY: reason` lines and never contain a value. */
export function parseEnv(source: Record<string, unknown>): ParseEnvResult {
  const result = schema.safeParse({ VITE_API_URL: source['VITE_API_URL'] || undefined });
  if (result.success) return { ok: true, env: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
  };
}

export function formatEnvErrors(errors: string[]): string {
  const lines = errors.map((e) => `  - ${e}`).join('\n');
  return `Invalid web configuration (see web/.env.example):\n${lines}`;
}
