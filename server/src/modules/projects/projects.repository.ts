import type { ProjectRole } from './projects.schema.js';
import { query } from '../../db/pool.js';
import { withTransaction } from '../../db/transaction.js';

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithRoleRow extends ProjectRow {
  role: ProjectRole;
}

export interface ProjectListItemRow extends ProjectWithRoleRow {
  memberCount: number;
  taskCount: number;
}

export interface TaskCounts {
  todo: number;
  inProgress: number;
  done: number;
  archived: number;
  total: number;
}

export interface ProjectDetailRow extends ProjectWithRoleRow {
  memberCount: number;
  taskCounts: TaskCounts;
}

export interface ProjectMemberDetailRow {
  id: string;
  name: string;
  email: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface ProjectsRepository {
  createProjectWithMember(data: {
    name: string;
    description?: string | undefined;
    ownerId: string;
  }): Promise<ProjectWithRoleRow>;
  listUserProjects(
    userId: string,
    limit: number,
    cursor?: { updatedAt: string; id: string },
  ): Promise<{ rows: ProjectListItemRow[]; hasMore: boolean; nextCursor: string | null }>;
  getProjectById(projectId: string, userId: string): Promise<ProjectDetailRow | null>;
  updateProject(
    projectId: string,
    data: { name?: string | undefined; description?: string | null | undefined },
  ): Promise<ProjectRow>;
  deleteProject(projectId: string): Promise<void>;
  listMembers(projectId: string): Promise<ProjectMemberDetailRow[]>;
  findMember(projectId: string, userId: string): Promise<{ role: ProjectRole } | null>;
  countOwners(projectId: string): Promise<number>;
  addMember(projectId: string, userId: string, role: ProjectRole): Promise<ProjectMemberDetailRow>;
  updateMemberRole(
    projectId: string,
    userId: string,
    role: ProjectRole,
  ): Promise<ProjectMemberDetailRow>;
  removeMember(projectId: string, userId: string): Promise<void>;
  transferOwnership(projectId: string, currentOwnerId: string, newOwnerId: string): Promise<void>;
}

export class PostgresProjectsRepository implements ProjectsRepository {
  async createProjectWithMember({
    name,
    description,
    ownerId,
  }: {
    name: string;
    description?: string | undefined;
    ownerId: string;
  }): Promise<ProjectWithRoleRow> {
    return withTransaction(async (client) => {
      const projResult = await client.query<ProjectRow>(
        `INSERT INTO projects (name, description, owner_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, description, owner_id AS "ownerId", created_at AS "createdAt", updated_at AS "updatedAt"`,
        [name, description ?? null, ownerId],
      );

      const project = projResult.rows[0];
      if (!project) throw new Error('Failed to create project');

      await client.query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [project.id, ownerId],
      );

      return {
        ...project,
        role: 'owner',
      };
    });
  }

  async listUserProjects(
    userId: string,
    limit: number,
    cursor?: { updatedAt: string; id: string },
  ): Promise<{ rows: ProjectListItemRow[]; hasMore: boolean; nextCursor: string | null }> {
    const params: unknown[] = [userId];
    let cursorClause = '';

    if (cursor) {
      params.push(cursor.updatedAt, cursor.id);
      cursorClause = `AND (p.updated_at, p.id) < ($2, $3)`;
    }

    params.push(limit + 1);
    const limitPlaceholder = `$${params.length}`;

    const result = await query<ProjectListItemRow>(
      `SELECT p.id, p.name, p.description, p.owner_id AS "ownerId",
              pm.role, p.created_at AS "createdAt", p.updated_at AS "updatedAt",
              (SELECT COUNT(*)::int FROM project_members WHERE project_id = p.id) AS "memberCount",
              (SELECT COUNT(*)::int FROM tasks WHERE project_id = p.id) AS "taskCount"
       FROM projects p
       INNER JOIN project_members pm ON p.id = pm.project_id
       WHERE pm.user_id = $1
       ${cursorClause}
       ORDER BY p.updated_at DESC, p.id DESC
       LIMIT ${limitPlaceholder}`,
      params,
    );

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
    let nextCursor: string | null = null;
    if (hasMore && rows.length > 0) {
      const last = rows[rows.length - 1]!;
      nextCursor = Buffer.from(JSON.stringify({ updatedAt: last.updatedAt, id: last.id })).toString(
        'base64url',
      );
    }

    return { rows, hasMore, nextCursor };
  }

  async getProjectById(projectId: string, userId: string): Promise<ProjectDetailRow | null> {
    const result = await query<{
      id: string;
      name: string;
      description: string | null;
      ownerId: string;
      role: ProjectRole;
      createdAt: string;
      updatedAt: string;
      memberCount: number;
      todoCount: number;
      inProgressCount: number;
      doneCount: number;
      archivedCount: number;
      totalTasks: number;
    }>(
      `SELECT p.id, p.name, p.description, p.owner_id AS "ownerId",
              pm.role, p.created_at AS "createdAt", p.updated_at AS "updatedAt",
              (SELECT COUNT(*)::int FROM project_members WHERE project_id = p.id) AS "memberCount",
              (SELECT COUNT(*)::int FROM tasks WHERE project_id = p.id AND status = 'todo') AS "todoCount",
              (SELECT COUNT(*)::int FROM tasks WHERE project_id = p.id AND status = 'in_progress') AS "inProgressCount",
              (SELECT COUNT(*)::int FROM tasks WHERE project_id = p.id AND status = 'done') AS "doneCount",
              (SELECT COUNT(*)::int FROM tasks WHERE project_id = p.id AND status = 'archived') AS "archivedCount",
              (SELECT COUNT(*)::int FROM tasks WHERE project_id = p.id) AS "totalTasks"
       FROM projects p
       INNER JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2
       WHERE p.id = $1`,
      [projectId, userId],
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      ownerId: row.ownerId,
      role: row.role,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      memberCount: row.memberCount,
      taskCounts: {
        todo: row.todoCount,
        inProgress: row.inProgressCount,
        done: row.doneCount,
        archived: row.archivedCount,
        total: row.totalTasks,
      },
    };
  }

  async updateProject(
    projectId: string,
    data: { name?: string | undefined; description?: string | null | undefined },
  ): Promise<ProjectRow> {
    const fields: string[] = [];
    const values: unknown[] = [projectId];
    let paramIndex = 2;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    fields.push(`updated_at = now()`);

    const result = await query<ProjectRow>(
      `UPDATE projects
       SET ${fields.join(', ')}
       WHERE id = $1
       RETURNING id, name, description, owner_id AS "ownerId", created_at AS "createdAt", updated_at AS "updatedAt"`,
      values,
    );

    const updated = result.rows[0];
    if (!updated) throw new Error('Failed to update project');
    return updated;
  }

  async deleteProject(projectId: string): Promise<void> {
    await query(`DELETE FROM projects WHERE id = $1`, [projectId]);
  }

  async listMembers(projectId: string): Promise<ProjectMemberDetailRow[]> {
    const result = await query<ProjectMemberDetailRow>(
      `SELECT u.id, u.name, u.email, pm.role, pm.created_at AS "joinedAt"
       FROM project_members pm
       INNER JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.created_at ASC`,
      [projectId],
    );
    return result.rows;
  }

  async findMember(projectId: string, userId: string): Promise<{ role: ProjectRole } | null> {
    const result = await query<{ role: ProjectRole }>(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId],
    );
    return result.rows[0] ?? null;
  }

  async countOwners(projectId: string): Promise<number> {
    const result = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM project_members WHERE project_id = $1 AND role = 'owner'`,
      [projectId],
    );
    return result.rows[0]?.count ?? 0;
  }

  async addMember(
    projectId: string,
    userId: string,
    role: ProjectRole,
  ): Promise<ProjectMemberDetailRow> {
    await query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)`,
      [projectId, userId, role],
    );

    const memberDetails = await query<ProjectMemberDetailRow>(
      `SELECT u.id, u.name, u.email, pm.role, pm.created_at AS "joinedAt"
       FROM project_members pm
       INNER JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1 AND pm.user_id = $2`,
      [projectId, userId],
    );

    const row = memberDetails.rows[0];
    if (!row) throw new Error('Failed to add project member');
    return row;
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    role: ProjectRole,
  ): Promise<ProjectMemberDetailRow> {
    await query(`UPDATE project_members SET role = $3 WHERE project_id = $1 AND user_id = $2`, [
      projectId,
      userId,
      role,
    ]);

    const memberDetails = await query<ProjectMemberDetailRow>(
      `SELECT u.id, u.name, u.email, pm.role, pm.created_at AS "joinedAt"
       FROM project_members pm
       INNER JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1 AND pm.user_id = $2`,
      [projectId, userId],
    );

    const row = memberDetails.rows[0];
    if (!row) throw new Error('Failed to update project member');
    return row;
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    await query(`DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`, [
      projectId,
      userId,
    ]);
  }

  async transferOwnership(
    projectId: string,
    currentOwnerId: string,
    newOwnerId: string,
  ): Promise<void> {
    await withTransaction(async (client) => {
      await client.query(`UPDATE projects SET owner_id = $2, updated_at = now() WHERE id = $1`, [
        projectId,
        newOwnerId,
      ]);

      await client.query(
        `UPDATE project_members SET role = 'owner' WHERE project_id = $1 AND user_id = $2`,
        [projectId, newOwnerId],
      );

      await client.query(
        `UPDATE project_members SET role = 'admin' WHERE project_id = $1 AND user_id = $2`,
        [projectId, currentOwnerId],
      );
    });
  }
}

export const projectsRepository = new PostgresProjectsRepository();
