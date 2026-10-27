exports.up = (pgm) => {
  // These tables are new and empty during this milestone, so transactional indexes are safer and
  // fast enough. A later production migration on a populated table must use CONCURRENTLY.
  // Default board view: project and status filter followed by due-date ordering.
  pgm.createIndex('tasks', ['project_id', 'status', 'due_date']);
  // "My tasks" excludes unassigned rows, so avoid carrying their nulls in the index.
  pgm.createIndex('tasks', 'assignee_id', { where: 'assignee_id IS NOT NULL' });
  // Stable keyset pagination within a project.
  pgm.createIndex('tasks', ['project_id', { name: 'created_at', sort: 'DESC' }]);
  // Authorization asks for all project memberships belonging to a user.
  pgm.createIndex('project_members', 'user_id');
};

exports.down = (pgm) => {
  pgm.dropIndex('project_members', 'user_id');
  pgm.dropIndex('tasks', ['project_id', 'created_at']);
  pgm.dropIndex('tasks', 'assignee_id');
  pgm.dropIndex('tasks', ['project_id', 'status', 'due_date']);
};
