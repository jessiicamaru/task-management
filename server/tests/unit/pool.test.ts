import { describe, expect, it, vi } from 'vitest';

import { connectWithRetry } from '../../src/db/pool.js';

describe('connectWithRetry', () => {
  it('releases the startup connection after a successful attempt', async () => {
    const release = vi.fn();
    const connect = vi.fn().mockResolvedValue({ release });

    await connectWithRetry({ connect, attempts: 1 });

    expect(connect).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it('uses capped exponential backoff and throws the last failure', async () => {
    const first = new Error('first');
    const last = new Error('last');
    const connect = vi.fn().mockRejectedValueOnce(first).mockRejectedValueOnce(last);
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      connectWithRetry({ connect, sleep, random: () => 1, attempts: 2, baseDelayMs: 250 }),
    ).rejects.toBe(last);
    expect(sleep).toHaveBeenCalledWith(250);
  });
});
