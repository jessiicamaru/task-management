import { readdir } from 'node:fs/promises';

import { closePool, query } from './pool.js';

interface AppliedMigration {
  name: string;
  run_on: Date;
}

try {
  const files = (await readdir(new URL('../../migrations/', import.meta.url)))
    .filter((name) => /\.(?:cjs|mjs|js|sql|ts)$/.test(name))
    .sort();

  const table = await query<{ exists: boolean }>(
    "SELECT to_regclass('public.pgmigrations') IS NOT NULL AS exists",
  );
  const applied = table.rows[0]?.exists
    ? await query<AppliedMigration>('SELECT name, run_on FROM pgmigrations ORDER BY id')
    : { rows: [] as AppliedMigration[] };
  const appliedByName = new Map(applied.rows.map((migration) => [migration.name, migration]));

  for (const file of files) {
    const name = file.replace(/\.[^.]+$/, '');
    const migration = appliedByName.get(name);
    process.stdout.write(
      migration ? `applied ${name} ${migration.run_on.toISOString()}\n` : `pending ${name}\n`,
    );
  }
} finally {
  await closePool();
}
