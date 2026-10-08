import { describe, expect, it } from 'vitest';

import {
  email,
  isoDate,
  paginationQuery,
  sortQuery,
  strictBody,
  uuidParam,
} from '../../src/utils/schemas.js';

describe('shared schemas', () => {
  it('email trims and lowercases before checking the format', () => {
    expect(email.parse('  Ada@Example.COM ')).toBe('ada@example.com');
    expect(email.safeParse('not-an-email').success).toBe(false);
  });

  it('paginationQuery coerces, defaults and caps limit', () => {
    expect(paginationQuery.parse({})).toEqual({ limit: 20 });
    expect(paginationQuery.parse({ limit: '5', cursor: 'abc' })).toEqual({
      limit: 5,
      cursor: 'abc',
    });
    for (const limit of ['abc', '0', '101', '99999', '2.5']) {
      expect(paginationQuery.safeParse({ limit }).success).toBe(false);
    }
  });

  it('uuidParam accepts a UUID only', () => {
    expect(uuidParam.safeParse({ id: '0d6f8c2e-7b1a-4c3d-9e5f-1a2b3c4d5e6f' }).success).toBe(true);
    expect(uuidParam.safeParse({ id: '42' }).success).toBe(false);
  });

  it('sortQuery allows listed fields ascending or descending', () => {
    const sort = sortQuery(['createdAt', 'priority']);

    expect(sort.parse({ sort: '-createdAt' })).toEqual({ sort: '-createdAt' });
    expect(sort.parse({})).toEqual({});
    expect(sort.safeParse({ sort: 'password' }).success).toBe(false);
  });

  it('isoDate requires a full timestamp', () => {
    expect(isoDate.safeParse('2026-10-08T09:00:00Z').success).toBe(true);
    expect(isoDate.safeParse('2026-10-08T09:00:00+07:00').success).toBe(true);
    expect(isoDate.safeParse('08/10/2026').success).toBe(false);
  });

  it('strictBody rejects unknown keys', () => {
    expect(strictBody({ title: email }).safeParse({ title: 'a@b.co', role: 'owner' }).success).toBe(
      false,
    );
  });
});
