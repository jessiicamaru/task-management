import { buildConfig, loadEnv } from './env.js';

/** The validated, grouped, frozen configuration. Importing this module validates the environment. */
export const config = buildConfig(loadEnv());
