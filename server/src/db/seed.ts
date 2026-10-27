import { closePool } from './pool.js';
import { withTransaction } from './transaction.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { hash } from '../modules/auth/password.js';

const USER_IDS = {
  alice: '10000000-0000-4000-8000-000000000001',
  bob: '10000000-0000-4000-8000-000000000002',
  carol: '10000000-0000-4000-8000-000000000003',
} as const;
const PROJECT_IDS = {
  website: '20000000-0000-4000-8000-000000000001',
  tools: '20000000-0000-4000-8000-000000000002',
} as const;

function taskCount(argv: string[]): number {
  const index = argv.indexOf('--tasks');
  if (index === -1) return 20;
  const value = Number(argv[index + 1]);
  if (!Number.isSafeInteger(value) || value < 1 || value > 999_999) {
    throw new Error('--tasks must be an integer between 1 and 999999');
  }
  return value;
}

if (config.isProduction && !config.seed.force) {
  throw new Error('Refusing to seed production; set SEED_FORCE=1 only for an intentional run');
}

const count = taskCount(process.argv.slice(2));
const passwordHash = await hash('Password123!');

try {
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO users (id, email, password_hash, name)
       VALUES ($1, $2, $3, $4), ($5, $6, $3, $7), ($8, $9, $3, $10)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, name = EXCLUDED.name`,
      [
        USER_IDS.alice,
        'alice@example.com',
        passwordHash,
        'Alice Owner',
        USER_IDS.bob,
        'bob@example.com',
        'Bob Member',
        USER_IDS.carol,
        'carol@example.com',
        'Carol Outsider',
      ],
    );

    // Remove only the deterministic demo projects; cascades make a rerun duplicate-free.
    await client.query('DELETE FROM projects WHERE id = ANY($1::uuid[])', [
      [PROJECT_IDS.website, PROJECT_IDS.tools],
    ]);
    await client.query(
      `INSERT INTO projects (id, owner_id, name, description)
       VALUES ($1, $3, $4, $5), ($2, $3, $6, $7)`,
      [
        PROJECT_IDS.website,
        PROJECT_IDS.tools,
        USER_IDS.alice,
        'Website Redesign',
        'Public website redesign demo project',
        'Internal Tools',
        'Internal productivity tools demo project',
      ],
    );
    await client.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, 'owner'), ($1, $3, 'member'), ($4, $2, 'owner')`,
      [PROJECT_IDS.website, USER_IDS.alice, USER_IDS.bob, PROJECT_IDS.tools],
    );

    // generate_series keeps the 50k-task mode to one parameterized round trip.
    await client.query(
      `INSERT INTO tasks
         (id, project_id, title, description, status, priority, due_date, assignee_id,
          created_by, completed_at)
       SELECT
         ('30000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
         CASE WHEN n % 4 = 0 THEN $1::uuid ELSE $2::uuid END,
         'Demo task ' || n,
         'Deterministic seeded task for local development',
         (ARRAY['todo', 'in_progress', 'done', 'archived']::task_status[])[1 + (n - 1) % 4],
         (ARRAY['low', 'medium', 'high', 'urgent']::task_priority[])[1 + (n - 1) % 4],
         CASE WHEN n % 5 = 0 THEN NULL
              WHEN n % 2 = 0 THEN now() - interval '7 days'
              ELSE now() + interval '7 days' END,
         CASE WHEN n % 3 = 0 THEN NULL
              WHEN n % 2 = 0 THEN $3::uuid ELSE $4::uuid END,
         $3::uuid,
         CASE WHEN n % 4 = 3 THEN now() ELSE NULL END
       FROM generate_series(1, $5::integer) AS n`,
      [PROJECT_IDS.tools, PROJECT_IDS.website, USER_IDS.alice, USER_IDS.bob, count],
    );

    await client.query(
      `INSERT INTO task_comments (id, task_id, author_id, body)
       VALUES
         ($1, $2, $3, $4),
         ($5, $2, $6, $7)`,
      [
        '40000000-0000-4000-8000-000000000001',
        '30000000-0000-4000-8000-000000000001',
        USER_IDS.alice,
        'Kickoff notes are ready.',
        '40000000-0000-4000-8000-000000000002',
        USER_IDS.bob,
        'I will take the first pass.',
      ],
    );
  });

  logger.info(
    { taskCount: count, users: ['alice@example.com', 'bob@example.com', 'carol@example.com'] },
    'demo data seeded; password for all demo users is Password123!',
  );
} finally {
  await closePool();
}
