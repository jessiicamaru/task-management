import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Several suites spawn the server through tsx (boot, crash, SIGTERM); cold-starting tsx while
    // other suites run in parallel can exceed Vitest's 5 s default.
    testTimeout: 20_000,
    // Importing the app validates the environment (src/config), so tests get a complete one.
    // These are test-only values; nothing here reaches a real database or signs a real token.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/task_management_test',
      JWT_SECRET: 'test-only-secret-that-is-at-least-32-characters',
      LOG_LEVEL: 'silent',
    },
  },
});
