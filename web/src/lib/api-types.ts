/**
 * API types — hand-written contract matching the Express API (#7, #12, #18, #28).
 * Note: These types will eventually be generated from the OpenAPI specification (#32).
 */

export interface ApiErrorDetail {
  path: string;
  message: string;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    requestId: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  user: User;
}

export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  role: ProjectRole;
  memberCount?: number;
  taskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCounts {
  todo: number;
  inProgress: number;
  done: number;
  archived: number;
  total: number;
}

export interface ProjectDetail extends Project {
  memberCount: number;
  taskCounts: TaskCounts;
}

export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: ProjectRole;
  joinedAt: string;
}

export interface PaginationEnvelope<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  creatorId: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}
