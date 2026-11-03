import { query } from '../../db/pool.js';

export interface CommentRow {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentDto {
  id: string;
  taskId: string;
  body: string;
  author: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
}

export interface TaskAccessRow {
  id: string;
  projectId: string;
  callerRole: string | null;
}

export interface CommentAccessRow {
  id: string;
  taskId: string;
  authorId: string;
  callerRole: string | null;
}

export interface CommentListResult {
  data: CommentDto[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export function toCommentDto(row: CommentRow): CommentDto {
  const isEdited = new Date(row.updatedAt).getTime() > new Date(row.createdAt).getTime();
  return {
    id: row.id,
    taskId: row.taskId,
    body: row.body,
    author: {
      id: row.authorId,
      name: row.authorName,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    editedAt: isEdited ? row.updatedAt : null,
  };
}

export interface CommentsRepository {
  findTaskWithMembership(taskId: string, userId: string): Promise<TaskAccessRow | null>;
  findCommentWithMembership(commentId: string, userId: string): Promise<CommentAccessRow | null>;
  createComment(taskId: string, authorId: string, body: string): Promise<CommentDto>;
  updateComment(commentId: string, body: string): Promise<CommentDto>;
  deleteComment(commentId: string): Promise<void>;
  listComments(taskId: string, limit: number, cursor?: string): Promise<CommentListResult>;
}

export class PostgresCommentsRepository implements CommentsRepository {
  async findTaskWithMembership(taskId: string, userId: string): Promise<TaskAccessRow | null> {
    const result = await query<TaskAccessRow>(
      `
      SELECT 
        t.id, 
        t.project_id AS "projectId", 
        pm.role AS "callerRole"
      FROM tasks t
      LEFT JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = $2
      WHERE t.id = $1
      `,
      [taskId, userId],
    );

    return result.rows[0] ?? null;
  }

  async findCommentWithMembership(
    commentId: string,
    userId: string,
  ): Promise<CommentAccessRow | null> {
    const result = await query<CommentAccessRow>(
      `
      SELECT 
        c.id, 
        c.task_id AS "taskId", 
        c.author_id AS "authorId", 
        pm.role AS "callerRole"
      FROM task_comments c
      INNER JOIN tasks t ON c.task_id = t.id
      LEFT JOIN project_members pm ON t.project_id = pm.project_id AND pm.user_id = $2
      WHERE c.id = $1
      `,
      [commentId, userId],
    );

    return result.rows[0] ?? null;
  }

  async createComment(taskId: string, authorId: string, body: string): Promise<CommentDto> {
    const result = await query<CommentRow>(
      `
      WITH inserted AS (
        INSERT INTO task_comments (task_id, author_id, body)
        VALUES ($1, $2, $3)
        RETURNING id, task_id, author_id, body, created_at, updated_at
      )
      SELECT 
        i.id, 
        i.task_id AS "taskId", 
        i.author_id AS "authorId", 
        i.body,
        i.created_at AS "createdAt", 
        i.updated_at AS "updatedAt",
        u.name AS "authorName"
      FROM inserted i
      INNER JOIN users u ON i.author_id = u.id
      `,
      [taskId, authorId, body],
    );

    return toCommentDto(result.rows[0]!);
  }

  async updateComment(commentId: string, body: string): Promise<CommentDto> {
    const result = await query<CommentRow>(
      `
      WITH updated AS (
        UPDATE task_comments
        SET body = $2
        WHERE id = $1
        RETURNING id, task_id, author_id, body, created_at, updated_at
      )
      SELECT 
        u_c.id, 
        u_c.task_id AS "taskId", 
        u_c.author_id AS "authorId", 
        u_c.body,
        u_c.created_at AS "createdAt", 
        u_c.updated_at AS "updatedAt",
        u.name AS "authorName"
      FROM updated u_c
      INNER JOIN users u ON u_c.author_id = u.id
      `,
      [commentId, body],
    );

    return toCommentDto(result.rows[0]!);
  }

  async deleteComment(commentId: string): Promise<void> {
    await query('DELETE FROM task_comments WHERE id = $1', [commentId]);
  }

  async listComments(taskId: string, limit: number, cursor?: string): Promise<CommentListResult> {
    const params: unknown[] = [taskId];
    const whereConditions: string[] = ['c.task_id = $1'];

    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
          createdAt: string;
          id: string;
        };
        if (decoded.createdAt && decoded.id) {
          params.push(decoded.createdAt);
          const createdAtPlaceholder = `$${params.length}`;
          params.push(decoded.id);
          const idPlaceholder = `$${params.length}`;

          whereConditions.push(
            `(c.created_at, c.id) > (${createdAtPlaceholder}, ${idPlaceholder})`,
          );
        }
      } catch {
        // Ignore invalid cursor
      }
    }

    params.push(limit + 1);
    const limitPlaceholder = `$${params.length}`;

    const sql = `
      SELECT 
        c.id, 
        c.task_id AS "taskId", 
        c.author_id AS "authorId", 
        c.body,
        c.created_at AS "createdAt", 
        c.updated_at AS "updatedAt",
        u.name AS "authorName"
      FROM task_comments c
      INNER JOIN users u ON c.author_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY c.created_at ASC, c.id ASC
      LIMIT ${limitPlaceholder}
    `;

    const result = await query<CommentRow>(sql, params);

    const hasMore = result.rows.length > limit;
    const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
    let nextCursor: string | null = null;

    if (hasMore && rows.length > 0) {
      const last = rows[rows.length - 1]!;
      nextCursor = Buffer.from(JSON.stringify({ createdAt: last.createdAt, id: last.id })).toString(
        'base64url',
      );
    }

    return {
      data: rows.map(toCommentDto),
      pagination: {
        nextCursor,
        hasMore,
        limit,
      },
    };
  }
}

export const commentsRepository = new PostgresCommentsRepository();
