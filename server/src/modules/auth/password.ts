import { hash as argonHash, parseOptions, verify as argonVerify } from '@node-rs/argon2';

import { logger } from '../../config/logger.js';

const MAX_PASSWORD_LENGTH = 128;
const POLICY = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

// A real policy-strength hash used when an email lookup finds no user. Verifying it burns the same
// work as a wrong password for an existing user and keeps account existence out of response timing.
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$qlONKdgqwYC0XF5u9KNOaA$9Fwrt4jvrutOu6drmj0EBI+jk28nyyCD8kGm3gM+1g8';

const validLength = (plain: string): boolean =>
  plain.length > 0 && [...plain].length <= MAX_PASSWORD_LENGTH;

export async function hash(plain: string): Promise<string> {
  if (!validLength(plain)) {
    throw new RangeError(`password must contain between 1 and ${MAX_PASSWORD_LENGTH} characters`);
  }
  return argonHash(plain, POLICY);
}

/** Malformed stored hashes and overlong inputs are authentication failures, never server errors. */
export async function verify(storedHash: string, plain: string): Promise<boolean> {
  if (!validLength(plain)) return false;
  try {
    return await argonVerify(storedHash, plain);
  } catch (err) {
    logger.warn({ err }, 'stored password hash could not be verified');
    return false;
  }
}

export function needsRehash(storedHash: string): boolean {
  try {
    const parsed = parseOptions(storedHash);
    return (
      Number(parsed.algorithm) !== 2 ||
      Number(parsed.version) !== 1 ||
      parsed.memoryCost < POLICY.memoryCost ||
      parsed.timeCost < POLICY.timeCost ||
      parsed.parallelism !== POLICY.parallelism ||
      parsed.outputLen < POLICY.outputLen
    );
  } catch {
    return true;
  }
}

/** Use on the user-not-found branch to make login timing independent of account existence. */
export async function dummyVerify(plain: string): Promise<void> {
  await verify(DUMMY_HASH, validLength(plain) ? plain : 'invalid-password-length');
}

/** Verifies and transparently upgrades an old hash while the plaintext is available. */
export async function verifyAndRehash(
  storedHash: string,
  plain: string,
  updateHash: (newHash: string) => Promise<void>,
): Promise<boolean> {
  if (!(await verify(storedHash, plain))) return false;
  if (needsRehash(storedHash)) await updateHash(await hash(plain));
  return true;
}
