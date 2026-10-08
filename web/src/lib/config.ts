import { formatEnvErrors, parseEnv } from './env';

/** Thrown when the bundle was built without valid configuration; main.tsx renders it readably. */
export class ConfigError extends Error {
  override name = 'ConfigError';
}

const result = parseEnv(import.meta.env);
if (!result.ok) throw new ConfigError(formatEnvErrors(result.errors));

/** Validated configuration. Importing this module validates import.meta.env. */
export const env = result.env;
