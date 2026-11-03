import type { TaskPriority, TaskStatus } from './tasks.schema.js';
import { query } from '../../db/pool.js';

export interface TaskRow {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assigneeId: string | null;
  createdBy: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithUsersRow extends TaskRow {
  assigneeName: string | null;
  createdByName: string;
  callerRole?: string | undefined;
}

export interface TaskDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  assignee: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export function toTaskDto(row: TaskWithUsersRow): TaskDto {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.dueDate,
    completedAt: row.completedAt,
    assignee:
      row.assigneeId && row.assigneeName ? { id: row.assigneeId, name: row.assigneeName } : null,
    createdBy: { id: row.createdBy, name: row.createdByName },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface CreateTaskData {
  projectId: string;
  title: string;
  description?: string | null | undefined;
  priority: TaskPriority;
  dueDate?: string | null | undefined;
  assigneeId?: string | null | undefined;
  createdBy: string;
}

export interface UpdateTaskData {
  title?: string | undefined;
  description?: string | null | undefined;
  priority?: TaskPriority | undefined;
  status?: TaskStatus | undefined;
  dueDate?: string | null | undefined;
  assigneeId?: string | null | undefined;
  completedAt?: string | null | undefined;
}

export interface TaskFilterOptions {
  projectId: string;
  status?: TaskStatus | TaskStatus[] | undefined;
  priority?: TaskPriority | TaskPriority[] | undefined;
  assigneeId?: string | undefined; // 'me' | 'unassigned' | uuid
  userId: string;
  dueBefore?: string | undefined;
  dueAfter?: string | undefined;
  q?: string | undefined;
  sort: string;
  limit: number;
  cursor?: string | undefined;
  includeTotal?: boolean | undefined;
}

export interface TaskListResult {
  data: TaskDto[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
    total?: number | undefined;
  };
}

export interface TasksRepository {
  createTask(data: CreateTaskData): Promise<TaskWithUsersRow>;
  getTaskByIdAndUser(taskId: string, userId: string): Promise<TaskWithUsersRow | null>;
  isProjectMember(projectId: string, userId: string): Promise<boolean>;
  updateTask(
    taskId: string,
    data: UpdateTaskData,
    expectedStatus?: TaskStatus,
  ): Promise<TaskWithUsersRow | null>;
  deleteTask(taskId: string): Promise<boolean>;
  listTasks(options: TaskFilterOptions): Promise<TaskListResult>;
}

function escapeLike(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

export class PostgresTasksRepository implements TasksRepository {
  async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    const result = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM project_members WHERE project_id = $1 AND user_id = $2`,
      [projectId, userId],
    );
    return (result.rows[0]?.count ?? 0) > 0;
  }

  async createTask(data: CreateTaskData): Promise<TaskWithUsersRow> {
    const insertResult = await query<{ id: string }>(
      `INSERT INTO tasks (project_id, title, description, priority, due_date, assignee_id, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'todo')
       RETURNING id`,
      [
        data.projectId,
        data.title,
        data.description ?? null,
        data.priority,
        data.dueDate ?? null,
        data.assigneeId ?? null,
        data.createdBy,
      ],
    );

    const taskId = insertResult.rows[0]?.id;
    if (!taskId) throw new Error('Failed to insert task');

    const fullTask = await query<TaskWithUsersRow>(
      `SELECT 
         t.id, t.project_id AS "projectId", t.title, t.description, t.status, t.priority,
         t.due_date AS "dueDate", t.assignee_id AS "assigneeId", t.created_by AS "createdBy",
         t.completed_at AS "completedAt", t.created_at AS "createdAt", t.updated_at AS "updatedAt",
         ua.name AS "assigneeName",
         uc.name AS "createdByName"
       FROM tasks t
       INNER JOIN users uc ON t.created_by = uc.id
       LEFT JOIN users ua ON t.assignee_id = ua.id
       WHERE t.id = $1`,
      [taskId],
    );

    const row = fullTask.rows[0];
    if (!row) throw new Error('Failed to retrieve created task');
    return row;
  }

  async getTaskByIdAndUser(taskId: string, userId: string): Promise<TaskWithUsersRow | null> {
    const result = await query<TaskWithUsersRow>(
      `SELECT 
         t.id, t.project_id AS "projectId", t.title, t.description, t.status, t.priority,
         t.due_date AS "dueDate", t.assignee_id AS "assigneeId", t.created_by AS "createdBy",
         t.completed_at AS "completedAt", t.created_at AS "createdAt", t.updated_at AS "updatedAt",
         ua.name AS "assigneeName",
         uc.name AS "createdByName",
         pm.role AS "callerRole"
       FROM tasks t
       INNER JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = $2
       INNER JOIN users uc ON t.created_by = uc.id
       LEFT JOIN users ua ON t.assignee_id = ua.id
       WHERE t.id = $1`,
      [taskId, userId],
    );

    return result.rows[0] ?? null;
  }

  async updateTask(
    taskId: string,
    data: UpdateTaskData,
    expectedStatus?: TaskStatus,
  ): Promise<TaskWithUsersRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [taskId];
    let paramIndex = 2;

    if (data.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.priority !== undefined) {
      fields.push(`priority = $${paramIndex++}`);
      values.push(data.priority);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.dueDate !== undefined) {
      fields.push(`due_date = $${paramIndex++}`);
      values.push(data.dueDate);
    }
    if (data.assigneeId !== undefined) {
      fields.push(`assignee_id = $${paramIndex++}`);
      values.push(data.assigneeId);
    }
    if (data.completedAt !== undefined) {
      fields.push(`completed_at = $${paramIndex++}`);
      values.push(data.completedAt);
    }

    fields.push(`updated_at = now()`);

    let whereClause = `WHERE id = $1`;
    if (expectedStatus !== undefined) {
      whereClause += ` AND status = $${paramIndex++}`;
      values.push(expectedStatus);
    }

    const updateResult = await query(
      `UPDATE tasks
       SET ${fields.join(', ')}
       ${whereClause}`,
      values,
    );

    if (updateResult.rowCount === 0) {
      return null;
    }

    const fullTask = await query<TaskWithUsersRow>(
      `SELECT 
         t.id, t.project_id AS "projectId", t.title, t.description, t.status, t.priority,
         t.due_date AS "dueDate", t.assignee_id AS "assigneeId", t.created_by AS "createdBy",
         t.completed_at AS "completedAt", t.created_at AS "createdAt", t.updated_at AS "updatedAt",
         ua.name AS "assigneeName",
         uc.name AS "createdByName"
       FROM tasks t
       INNER JOIN users uc ON t.created_by = uc.id
       LEFT JOIN users ua ON t.assignee_id = ua.id
       WHERE t.id = $1`,
      [taskId],
    );

    return fullTask.rows[0] ?? null;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const result = await query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
    return (result.rowCount ?? 0) > 0;
  }

  async listTasks(options: TaskFilterOptions): Promise<TaskListResult> {
    const {
      projectId,
      status,
      priority,
      assigneeId,
      userId,
      dueBefore,
      dueAfter,
      q,
      sort,
      limit,
      cursor,
      includeTotal,
    } = options;

    const whereConditions: string[] = ['t.project_id = $1'];
    const params: unknown[] = [projectId];
    let paramIndex = 2;

    // Filter: status
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      whereConditions.push(`t.status = ANY($${paramIndex++})`);
      params.push(statuses);
    }

    // Filter: priority
    if (priority) {
      const priorities = Array.isArray(priority) ? priority : [priority];
      whereConditions.push(`t.priority = ANY($${paramIndex++})`);
      params.push(priorities);
    }

    // Filter: assigneeId
    if (assigneeId) {
      if (assigneeId === 'me') {
        whereConditions.push(`t.assignee_id = $${paramIndex++}`);
        params.push(userId);
      } else if (assigneeId === 'unassigned') {
        whereConditions.push(`t.assignee_id IS NULL`);
      } else {
        whereConditions.push(`t.assignee_id = $${paramIndex++}`);
        params.push(assigneeId);
      }
    }

    // Filter: dueBefore / dueAfter
    if (dueBefore) {
      whereConditions.push(`t.due_date <= $${paramIndex++}`);
      params.push(dueBefore);
    }
    if (dueAfter) {
      whereConditions.push(`t.due_date >= $${paramIndex++}`);
      params.push(dueAfter);
    }

    // Filter: q search (title and description)
    if (q) {
      const escaped = `%${escapeLike(q)}%`;
      whereConditions.push(
        `(t.title ILIKE $${paramIndex} ESCAPE '\\' OR t.description ILIKE $${paramIndex} ESCAPE '\\')`,
      );
      params.push(escaped);
      paramIndex++;
    }

    // Total count if requested
    let total: number | undefined;
    if (includeTotal) {
      const totalResult = await query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM tasks t WHERE ${whereConditions.join(' AND ')}`,
        params,
      );
      total = totalResult.rows[0]?.count ?? 0;
    }

    // Sorting
    const sortFieldMap: Record<string, string> = {
      createdAt: 't.created_at',
      dueDate: 't.due_date',
      priority: 't.priority',
      status: 't.status',
    };

    const isDesc = sort.startsWith('-');
    const sortFieldKey = isDesc ? sort.substring(1) : sort;
    const sortColumn = sortFieldMap[sortFieldKey] ?? 't.created_at';
    const direction = isDesc ? 'DESC' : 'ASC';

    // Nulls handling: due_date sorts use NULLS LAST
    const nullsClause = sortColumn === 't.due_date' ? ' NULLS LAST' : '';
    const orderByClause = `ORDER BY ${sortColumn} ${direction}${nullsClause}, t.id ${direction}`;

    // Cursor pagination decoding
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
          sortValue: unknown;
          id: string;
        };

        if (decoded && decoded.id) {
          const op = isDesc ? '<' : '>';
          if (decoded.sortValue === null || decoded.sortValue === undefined) {
            // Null sort value in cursor
            whereConditions.push(`(t.id ${op} $${paramIndex++})`);
            params.push(decoded.id);
          } else {
            whereConditions.push(
              `(${sortColumn}, t.id) ${op} ($${paramIndex++}, $${paramIndex++})`,
            );
            params.push(decoded.sortValue, decoded.id);
          }
        }
      } catch {
        // Ignore invalid cursor
      }
    }

    params.push(limit + 1);
    const limitPlaceholder = `$${params.length}`;

    const sql = `
      SELECT 
        t.id, t.project_id AS "projectId", t.title, t.description, t.status, t.priority,
        t.due_date AS "dueDate", t.assignee_id AS "assigneeId", t.created_by AS "createdBy",
        t.completed_at AS "completedAt", t.created_at AS "createdAt", t.updated_at AS "updatedAt",
        ua.name AS "assigneeName",
        uc.name AS "createdByName"
      FROM tasks t
      INNER JOIN users uc ON t.created_by = uc.id
      LEFT JOIN users ua ON t.assignee_id = ua.id
      WHERE ${whereConditions.join(' AND ')}
      ${orderByClause}
      LIMIT ${limitPlaceholder}
    `;

    const result = await query<TaskWithUsersRow>(sql, params);

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
    let nextCursor: string | null = null;

    if (hasMore && rows.length > 0) {
      const last = rows[rows.length - 1]!;
      let sortValue: unknown = last.createdAt;
      if (sortFieldKey === 'dueDate') sortValue = last.dueDate;
      if (sortFieldKey === 'priority') sortValue = last.priority;
      if (sortFieldKey === 'status') sortValue = last.status;

      nextCursor = Buffer.from(JSON.stringify({ sortValue, id: last.id })).toString('base64url');
    }

    return {
      data: rows.map(toTaskDto),
      pagination: {
        nextCursor,
        hasMore,
        limit,
        ...(total !== undefined ? { total } : {}),
      },
    };
  }
}

export const tasksRepository = new PostgresTasksRepository();
