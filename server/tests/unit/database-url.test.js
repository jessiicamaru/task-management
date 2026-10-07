import { describe, expect, it } from 'vitest';

import { describeDatabaseUrl } from '../../src/utils/database-url.js';

describe('describeDatabaseUrl', () => {
  it('keeps host, port and database and drops the credentials', () => {
    const described = describeDatabaseUrl('postgres://admin:hunter2@db.internal:6543/tasks');

    expect(described).toEqual({ host: 'db.internal', port: 6543, database: 'tasks' });
    expect(JSON.stringify(described)).not.toContain('hunter2');
    expect(JSON.stringify(described)).not.toContain('admin');
  });

  it('defaults the port to 5432', () => {
    expect(describeDatabaseUrl('postgresql://u:p@localhost/app').port).toBe(5432);
  });

  it('never throws on a malformed URL', () => {
    expect(describeDatabaseUrl('not a url')).toEqual({ host: 'unparseable' });
  });
});
