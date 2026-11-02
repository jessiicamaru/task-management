import {
  projectsRepository,
  type ProjectDetailRow,
  type ProjectListItemRow,
  type ProjectMemberDetailRow,
  type ProjectRow,
  type ProjectsRepository,
  type ProjectWithRoleRow,
} from './projects.repository.js';
import type {
  AddMemberInput,
  CreateProjectInput,
  ProjectRole,
  UpdateMemberRoleInput,
  UpdateProjectInput,
} from './projects.schema.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { authRepository, type AuthRepository } from '../auth/auth.repository.js';

export interface ProjectListResult {
  data: ProjectListItemRow[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export class ProjectsService {
  constructor(
    private readonly repository: ProjectsRepository = projectsRepository,
    private readonly authRepo: AuthRepository = authRepository,
  ) {}

  private decodeCursor(cursor?: string): { updatedAt: string; id: string } | undefined {
    if (!cursor) return undefined;
    try {
      const json = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(json) as { updatedAt?: unknown; id?: unknown };
      if (typeof parsed?.updatedAt === 'string' && typeof parsed?.id === 'string') {
        return { updatedAt: parsed.updatedAt, id: parsed.id };
      }
    } catch {
      // Ignore invalid cursor
    }
    return undefined;
  }

  async createProject(userId: string, input: CreateProjectInput): Promise<ProjectWithRoleRow> {
    return this.repository.createProjectWithMember({
      name: input.name,
      description: input.description,
      ownerId: userId,
    });
  }

  async listProjects(userId: string, limit = 20, cursor?: string): Promise<ProjectListResult> {
    const decodedCursor = this.decodeCursor(cursor);
    const { rows, hasMore, nextCursor } = await this.repository.listUserProjects(
      userId,
      limit,
      decodedCursor,
    );
    return {
      data: rows,
      pagination: {
        nextCursor,
        hasMore,
        limit,
      },
    };
  }

  async getProject(projectId: string, userId: string): Promise<ProjectDetailRow> {
    const project = await this.repository.getProjectById(projectId, userId);
    if (!project) {
      throw new NotFoundError('Project not found', 'not_found');
    }
    return project;
  }

  async updateProject(projectId: string, input: UpdateProjectInput): Promise<ProjectRow> {
    return this.repository.updateProject(projectId, input);
  }

  async deleteProject(projectId: string): Promise<void> {
    return this.repository.deleteProject(projectId);
  }

  async listMembers(projectId: string): Promise<ProjectMemberDetailRow[]> {
    return this.repository.listMembers(projectId);
  }

  async addMember(
    projectId: string,
    callerRole: ProjectRole,
    input: AddMemberInput,
  ): Promise<ProjectMemberDetailRow> {
    if (callerRole !== 'owner' && callerRole !== 'admin') {
      throw new ForbiddenError('Only owner or admin can add members', 'forbidden');
    }

    if (callerRole === 'admin' && input.role !== 'member' && input.role !== 'viewer') {
      throw new ForbiddenError('Admins cannot assign admin or owner roles', 'forbidden');
    }

    if ((input.role as string) === 'owner') {
      throw new ForbiddenError('Cannot assign owner role directly', 'forbidden');
    }

    const user = await this.authRepo.findUserByEmailWithHash(input.email);
    if (!user) {
      throw new NotFoundError('User not found with this email', 'user_not_found');
    }

    const existingMember = await this.repository.findMember(projectId, user.id);
    if (existingMember) {
      throw new ConflictError('User is already a project member', 'member_already_exists');
    }

    try {
      return await this.repository.addMember(projectId, user.id, input.role);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr?.code === '23505') {
        throw new ConflictError('User is already a project member', 'member_already_exists');
      }
      throw err;
    }
  }

  async updateMemberRole(
    projectId: string,
    callerId: string,
    callerRole: ProjectRole,
    targetUserId: string,
    input: UpdateMemberRoleInput,
  ): Promise<ProjectMemberDetailRow> {
    if (callerRole !== 'owner' && callerRole !== 'admin') {
      throw new ForbiddenError('Only owner or admin can update member roles', 'forbidden');
    }

    if (callerId === targetUserId) {
      throw new ForbiddenError('Cannot change your own role', 'forbidden');
    }

    if ((input.role as string) === 'owner') {
      throw new ForbiddenError('Cannot set owner role via update', 'forbidden');
    }

    const target = await this.repository.findMember(projectId, targetUserId);
    if (!target) {
      throw new NotFoundError('Member not found', 'not_found');
    }

    if (target.role === 'owner') {
      throw new ForbiddenError('Cannot modify owner role', 'forbidden');
    }

    if (callerRole === 'admin' && (target.role === 'admin' || input.role === 'admin')) {
      throw new ForbiddenError('Admins cannot modify or assign admin roles', 'forbidden');
    }

    return this.repository.updateMemberRole(projectId, targetUserId, input.role);
  }

  async removeMember(
    projectId: string,
    callerId: string,
    callerRole: ProjectRole,
    targetUserId: string,
  ): Promise<void> {
    const isSelf = callerId === targetUserId;

    if (!isSelf && callerRole !== 'owner' && callerRole !== 'admin') {
      throw new ForbiddenError('Insufficient permissions to remove members', 'forbidden');
    }

    const target = await this.repository.findMember(projectId, targetUserId);
    if (!target) {
      throw new NotFoundError('Member not found', 'not_found');
    }

    if (target.role === 'owner') {
      const ownerCount = await this.repository.countOwners(projectId);
      if (ownerCount <= 1) {
        throw new ConflictError('Cannot remove the last owner of a project', 'last_owner');
      }
    }

    if (!isSelf && callerRole === 'admin' && (target.role === 'owner' || target.role === 'admin')) {
      throw new ForbiddenError('Admins cannot remove other admins or owners', 'forbidden');
    }

    return this.repository.removeMember(projectId, targetUserId);
  }

  async transferOwnership(
    projectId: string,
    callerId: string,
    callerRole: ProjectRole,
    newOwnerId: string,
  ): Promise<void> {
    if (callerRole !== 'owner') {
      throw new ForbiddenError('Only project owner can transfer ownership', 'forbidden');
    }

    if (callerId === newOwnerId) {
      return; // Already owner
    }

    const target = await this.repository.findMember(projectId, newOwnerId);
    if (!target) {
      throw new NotFoundError('New owner must be an existing member', 'not_found');
    }

    return this.repository.transferOwnership(projectId, callerId, newOwnerId);
  }
}

export const projectsService = new ProjectsService();
