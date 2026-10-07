import { readFileSync } from 'node:fs';

// Same depth from src/config/ and dist/config/, so this resolves in development and production.
const packageJson = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as { version: string };

/**
 * The running build: the package version, plus the short commit as semver build metadata when the
 * image was built with GIT_SHA (`0.1.0+abc1234`). Answers "which build is on Render" from outside.
 */
export function appVersion(gitSha: string | null): string {
  return gitSha ? `${packageJson.version}+${gitSha.slice(0, 7)}` : packageJson.version;
}
