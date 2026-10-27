exports.up = (pgm) => {
  pgm.createTable('refresh_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    token_hash: { type: 'text', notNull: true, unique: true },
    family_id: { type: 'uuid', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    revoked_at: { type: 'timestamptz' },
    user_agent: { type: 'text' },
    ip: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addColumn('refresh_tokens', {
    replaced_by: { type: 'uuid', references: 'refresh_tokens', onDelete: 'SET NULL' },
  });
  pgm.createIndex('refresh_tokens', ['user_id', 'revoked_at']);
  pgm.createIndex('refresh_tokens', 'expires_at');

  pgm.createTable('task_comments', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    task_id: { type: 'uuid', notNull: true, references: 'tasks', onDelete: 'CASCADE' },
    author_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    body: {
      type: 'text',
      notNull: true,
      check: 'length(trim(body)) BETWEEN 1 AND 5000',
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('task_comments', ['task_id', { name: 'created_at', sort: 'DESC' }]);
  pgm.sql(`CREATE TRIGGER task_comments_set_updated_at BEFORE UPDATE ON task_comments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER IF EXISTS task_comments_set_updated_at ON task_comments;');
  pgm.dropTable('task_comments');
  pgm.dropTable('refresh_tokens');
};
