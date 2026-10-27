import type { PoolClient } from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { pool } from '../../src/db/pool.js';
import { withTransaction } from '../../src/db/transaction.js';

const client = (query: ReturnType<typeof vi.fn>) => {
  const release = vi.fn();
  return { value: { query, release } as unknown as PoolClient, release };
};

afterEach(() => vi.restoreAllMocks());

describe('withTransaction', () => {
  it('commits and releases on success', async () => {
    const query = vi.fn().mockResolvedValue({});
    const fake = client(query);
    vi.spyOn(pool, 'connect').mockReturnValue(Promise.resolve(fake.value) as never);

    await expect(withTransaction(() => Promise.resolve('done'))).resolves.toBe('done');
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(['BEGIN', 'COMMIT']);
    expect(fake.release).toHaveBeenCalledOnce();
  });

  it('preserves the original error when rollback also fails and always releases', async () => {
    const original = new Error('work failed');
    const query = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('rollback failed'));
    const fake = client(query);
    vi.spyOn(pool, 'connect').mockReturnValue(Promise.resolve(fake.value) as never);

    await expect(withTransaction(() => Promise.reject(original))).rejects.toBe(original);
    expect(fake.release).toHaveBeenCalledOnce();
  });

  it('retries SQLSTATE 40001 when explicitly requested', async () => {
    const first = client(vi.fn().mockResolvedValue({}));
    const second = client(vi.fn().mockResolvedValue({}));
    vi.spyOn(pool, 'connect')
      .mockReturnValueOnce(Promise.resolve(first.value) as never)
      .mockReturnValueOnce(Promise.resolve(second.value) as never);
    const work = vi.fn().mockRejectedValueOnce({ code: '40001' }).mockResolvedValueOnce('ok');

    await expect(withTransaction(work, { retryOnSerializationFailure: true })).resolves.toBe('ok');
    expect(work).toHaveBeenCalledTimes(2);
    expect(first.release).toHaveBeenCalledOnce();
    expect(second.release).toHaveBeenCalledOnce();
  });
});
