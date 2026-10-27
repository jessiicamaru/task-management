/** @type {import('node-pg-migrate').ColumnDefinitions | undefined} */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });
  pgm.createExtension('citext', { ifNotExists: true });

  pgm.createType('task_status', ['todo', 'in_progress', 'done', 'archived']);
  pgm.createType('task_priority', ['low', 'medium', 'high', 'urgent']);
  pgm.createType('project_role', ['owner', 'admin', 'member', 'viewer']);

  const timestamps = {
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  };

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'citext', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    name: { type: 'text', notNull: true },
    ...timestamps,
  });

  pgm.createTable('projects', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    owner_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'RESTRICT',
    },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    ...timestamps,
  });

  pgm.createTable('project_members', {
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects',
      onDelete: 'CASCADE',
      primaryKey: true,
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
      primaryKey: true,
    },
    role: { type: 'project_role', notNull: true, default: 'member' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('tasks', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects',
      onDelete: 'CASCADE',
    },
    title: { type: 'text', notNull: true, check: 'length(trim(title)) > 0' },
    description: { type: 'text' },
    status: { type: 'task_status', notNull: true, default: 'todo' },
    priority: { type: 'task_priority', notNull: true, default: 'medium' },
    due_date: { type: 'timestamptz' },
    assignee_id: { type: 'uuid', references: 'users', onDelete: 'SET NULL' },
    created_by: { type: 'uuid', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    completed_at: { type: 'timestamptz' },
    ...timestamps,
  });

  pgm.sql(`
    CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON projects
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    CREATE TRIGGER tasks_set_updated_at BEFORE UPDATE ON tasks
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER IF EXISTS tasks_set_updated_at ON tasks;');
  pgm.sql('DROP TRIGGER IF EXISTS projects_set_updated_at ON projects;');
  pgm.sql('DROP TRIGGER IF EXISTS users_set_updated_at ON users;');
  pgm.dropFunction('set_updated_at', [], { ifExists: true });
  pgm.dropTable('tasks');
  pgm.dropTable('project_members');
  pgm.dropTable('projects');
  pgm.dropTable('users');
  pgm.dropType('project_role');
  pgm.dropType('task_priority');
  pgm.dropType('task_status');
  pgm.dropExtension('citext', { ifExists: true });
  pgm.dropExtension('pgcrypto', { ifExists: true });
};
