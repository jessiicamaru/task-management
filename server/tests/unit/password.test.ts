import { hash as rawHash } from '@node-rs/argon2';
import { describe, expect, it, vi } from 'vitest';

import {
  dummyVerify,
  hash,
  needsRehash,
  verify,
  verifyAndRehash,
} from '../../src/modules/auth/password.js';

describe('password hashing', () => {
  it('hashes with the policy and verifies only the right password', async () => {
    const stored = await hash('Password123!');

    expect(stored).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    await expect(verify(stored, 'Password123!')).resolves.toBe(true);
    await expect(verify(stored, 'wrong')).resolves.toBe(false);
    expect(needsRehash(stored)).toBe(false);
  });

  it('turns malformed hashes and overlong passwords into safe failures', async () => {
    await expect(verify('not-a-hash', 'Password123!')).resolves.toBe(false);
    await expect(verify('not-a-hash', 'x'.repeat(129))).resolves.toBe(false);
    await expect(hash('x'.repeat(129))).rejects.toBeInstanceOf(RangeError);
    expect(needsRehash('not-a-hash')).toBe(true);
  });

  it('upgrades a valid hash only when its policy is stale', async () => {
    const stale = await rawHash('Password123!', { memoryCost: 4096, timeCost: 1, parallelism: 1 });
    const update = vi.fn<(newHash: string) => Promise<void>>().mockResolvedValue(undefined);

    await expect(verifyAndRehash(stale, 'Password123!', update)).resolves.toBe(true);
    expect(update).toHaveBeenCalledOnce();
    await expect(verify(update.mock.calls[0]?.[0] ?? '', 'Password123!')).resolves.toBe(true);
  });

  it('provides a policy-strength dummy verification path', async () => {
    await expect(dummyVerify('any-password')).resolves.toBeUndefined();
  });
});
