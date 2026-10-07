import { parseEnv, type Env } from '../../src/config/env.js';

type Source = Readonly<Record<string, string | undefined>>;

/** Parses an environment that the test expects to be valid, failing loudly if it is not. */
export function validEnv(source: Source): Env {
  const result = parseEnv(source);
  if (!result.ok) throw new Error(`expected a valid env, got: ${result.errors.join('; ')}`);
  return result.env;
}

/** Parses an environment that the test expects to be invalid and returns its errors. */
export function envErrors(source: Source): string[] {
  const result = parseEnv(source);
  if (result.ok) throw new Error('expected an invalid env, but it parsed');
  return result.errors;
}
