import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthRepository } from '../../src/modules/auth/auth.repository.js';
import type {
  ProjectDetailRow,
  ProjectMemberDetailRow,
  ProjectsRepository,
  ProjectWithRoleRow,
} from '../../src/modules/projects/projects.repository.js';
import { ProjectsService } from '../../src/modules/projects/projects.service.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../src/utils/errors.js';

describe('ProjectsService - Unit Tests', () => {
  let createProjectWithMemberSpy: ReturnType<typeof vi.fn>;
  let listUserProjectsSpy: ReturnType<typeof vi.fn>;
  let getProjectByIdSpy: ReturnType<typeof vi.fn>;
  let updateProjectSpy: ReturnType<typeof vi.fn>;
  let deleteProjectSpy: ReturnType<typeof vi.fn>;
  let listMembersSpy: ReturnType<typeof vi.fn>;
  let findMemberSpy: ReturnType<typeof vi.fn>;
  let countOwnersSpy: ReturnType<typeof vi.fn>;
  let addMemberSpy: ReturnType<typeof vi.fn>;
  let updateMemberRoleSpy: ReturnType<typeof vi.fn>;
  let removeMemberSpy: ReturnType<typeof vi.fn>;
  let transferOwnershipSpy: ReturnType<typeof vi.fn>;

  let findUserByEmailSpy: ReturnType<typeof vi.fn>;

  let service: ProjectsService;

  beforeEach(() => {
    createProjectWithMemberSpy = vi.fn();
    listUserProjectsSpy = vi.fn();
    getProjectByIdSpy = vi.fn();
    updateProjectSpy = vi.fn();
    deleteProjectSpy = vi.fn();
    listMembersSpy = vi.fn();
    findMemberSpy = vi.fn();
    countOwnersSpy = vi.fn();
    addMemberSpy = vi.fn();
    updateMemberRoleSpy = vi.fn();
    removeMemberSpy = vi.fn();
    transferOwnershipSpy = vi.fn();

    findUserByEmailSpy = vi.fn();

    const mockRepo = {
      createProjectWithMember: createProjectWithMemberSpy,
      listUserProjects: listUserProjectsSpy,
      getProjectById: getProjectByIdSpy,
      updateProject: updateProjectSpy,
      deleteProject: deleteProjectSpy,
      listMembers: listMembersSpy,
      findMember: findMemberSpy,
      countOwners: countOwnersSpy,
      addMember: addMemberSpy,
      updateMemberRole: updateMemberRoleSpy,
      removeMember: removeMemberSpy,
      transferOwnership: transferOwnershipSpy,
    } as unknown as ProjectsRepository;

    const mockAuthRepo = {
      findUserByEmailWithHash: findUserByEmailSpy,
    } as unknown as AuthRepository;

    service = new ProjectsService(mockRepo, mockAuthRepo);
  });

  describe('createProject', () => {
    it('creates project with member atomically', async () => {
      const mockProject: ProjectWithRoleRow = {
        id: 'prj_1',
        name: 'Test Project',
        description: 'Test Desc',
        ownerId: 'usr_1',
        role: 'owner',
        createdAt: '2026-11-02T12:00:00Z',
        updatedAt: '2026-11-02T12:00:00Z',
      };
      createProjectWithMemberSpy.mockResolvedValue(mockProject);

      const result = await service.createProject('usr_1', {
        name: 'Test Project',
        description: 'Test Desc',
      });

      expect(createProjectWithMemberSpy).toHaveBeenCalledWith({
        name: 'Test Project',
        description: 'Test Desc',
        ownerId: 'usr_1',
      });
      expect(result).toEqual(mockProject);
    });
  });

  describe('listProjects', () => {
    it('returns paginated list of projects', async () => {
      listUserProjectsSpy.mockResolvedValue({
        rows: [],
        hasMore: false,
        nextCursor: null,
      });

      const result = await service.listProjects('usr_1', 10);
      expect(listUserProjectsSpy).toHaveBeenCalledWith('usr_1', 10, undefined);
      expect(result).toEqual({
        data: [],
        pagination: { nextCursor: null, hasMore: false, limit: 10 },
      });
    });
  });

  describe('getProject', () => {
    it('returns project details when found', async () => {
      const mockProject: ProjectDetailRow = {
        id: 'prj_1',
        name: 'Test Project',
        description: null,
        ownerId: 'usr_1',
        role: 'owner',
        createdAt: '2026-11-02T12:00:00Z',
        updatedAt: '2026-11-02T12:00:00Z',
        memberCount: 1,
        taskCounts: { todo: 1, inProgress: 0, done: 0, archived: 0, total: 1 },
      };
      getProjectByIdSpy.mockResolvedValue(mockProject);

      const result = await service.getProject('prj_1', 'usr_1');
      expect(result).toEqual(mockProject);
    });

    it('throws 404 if project is not found', async () => {
      getProjectByIdSpy.mockResolvedValue(null);

      await expect(service.getProject('prj_unknown', 'usr_1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('addMember', () => {
    it('rejects if caller role is member or viewer', async () => {
      await expect(
        service.addMember('prj_1', 'member', { email: 'user@example.com', role: 'viewer' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects if admin tries to add another admin', async () => {
      await expect(
        service.addMember('prj_1', 'admin', { email: 'user@example.com', role: 'admin' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects if caller tries to assign owner role', async () => {
      await expect(
        service.addMember('prj_1', 'owner', {
          email: 'user@example.com',
          role: 'owner' as unknown as 'admin',
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws 404 user_not_found if user email does not exist', async () => {
      findUserByEmailSpy.mockResolvedValue(null);

      await expect(
        service.addMember('prj_1', 'owner', { email: 'nonexistent@example.com', role: 'member' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws 409 member_already_exists if user is already a member', async () => {
      findUserByEmailSpy.mockResolvedValue({ id: 'usr_existing' });
      findMemberSpy.mockResolvedValue({ role: 'viewer' });

      await expect(
        service.addMember('prj_1', 'owner', { email: 'existing@example.com', role: 'member' }),
      ).rejects.toThrow(ConflictError);
    });

    it('successfully adds new member', async () => {
      findUserByEmailSpy.mockResolvedValue({ id: 'usr_new' });
      findMemberSpy.mockResolvedValue(null);
      const mockMember: ProjectMemberDetailRow = {
        id: 'usr_new',
        name: 'New Member',
        email: 'new@example.com',
        role: 'member',
        joinedAt: '2026-11-02T12:00:00Z',
      };
      addMemberSpy.mockResolvedValue(mockMember);

      const result = await service.addMember('prj_1', 'owner', {
        email: 'new@example.com',
        role: 'member',
      });
      expect(result).toEqual(mockMember);
    });
  });

  describe('updateMemberRole', () => {
    it('rejects self role change', async () => {
      await expect(
        service.updateMemberRole('prj_1', 'usr_1', 'owner', 'usr_1', { role: 'admin' }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects if target user does not exist', async () => {
      findMemberSpy.mockResolvedValue(null);

      await expect(
        service.updateMemberRole('prj_1', 'usr_caller', 'owner', 'usr_missing', {
          role: 'member',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects modifying owner role', async () => {
      findMemberSpy.mockResolvedValue({ role: 'owner' });

      await expect(
        service.updateMemberRole('prj_1', 'usr_caller', 'owner', 'usr_target', {
          role: 'admin',
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects admin modifying another admin', async () => {
      findMemberSpy.mockResolvedValue({ role: 'admin' });

      await expect(
        service.updateMemberRole('prj_1', 'usr_admin', 'admin', 'usr_target', {
          role: 'viewer',
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('allows owner to update role', async () => {
      findMemberSpy.mockResolvedValue({ role: 'viewer' });
      const updatedRow: ProjectMemberDetailRow = {
        id: 'usr_target',
        name: 'Target',
        email: 'target@example.com',
        role: 'member',
        joinedAt: '2026-11-02T12:00:00Z',
      };
      updateMemberRoleSpy.mockResolvedValue(updatedRow);

      const result = await service.updateMemberRole('prj_1', 'usr_owner', 'owner', 'usr_target', {
        role: 'member',
      });
      expect(result).toEqual(updatedRow);
    });
  });

  describe('removeMember', () => {
    it('throws 409 last_owner when removing the only owner', async () => {
      findMemberSpy.mockResolvedValue({ role: 'owner' });
      countOwnersSpy.mockResolvedValue(1);

      await expect(
        service.removeMember('prj_1', 'usr_owner', 'owner', 'usr_owner'),
      ).rejects.toThrow(ConflictError);
    });

    it('rejects admin trying to remove an owner', async () => {
      findMemberSpy.mockResolvedValue({ role: 'owner' });
      countOwnersSpy.mockResolvedValue(2);

      await expect(
        service.removeMember('prj_1', 'usr_admin', 'admin', 'usr_owner'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('rejects admin trying to remove another admin', async () => {
      findMemberSpy.mockResolvedValue({ role: 'admin' });

      await expect(
        service.removeMember('prj_1', 'usr_admin1', 'admin', 'usr_admin2'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('allows member to leave the project if not last owner', async () => {
      findMemberSpy.mockResolvedValue({ role: 'member' });
      removeMemberSpy.mockResolvedValue(undefined);

      await service.removeMember('prj_1', 'usr_member', 'member', 'usr_member');
      expect(removeMemberSpy).toHaveBeenCalledWith('prj_1', 'usr_member');
    });
  });

  describe('transferOwnership', () => {
    it('rejects non-owner transfer caller', async () => {
      await expect(
        service.transferOwnership('prj_1', 'usr_admin', 'admin', 'usr_target'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws 404 if target is not a project member', async () => {
      findMemberSpy.mockResolvedValue(null);

      await expect(
        service.transferOwnership('prj_1', 'usr_owner', 'owner', 'usr_non_member'),
      ).rejects.toThrow(NotFoundError);
    });

    it('transfers ownership atomically', async () => {
      findMemberSpy.mockResolvedValue({ role: 'member' });
      transferOwnershipSpy.mockResolvedValue(undefined);

      await service.transferOwnership('prj_1', 'usr_owner', 'owner', 'usr_member');
      expect(transferOwnershipSpy).toHaveBeenCalledWith('prj_1', 'usr_owner', 'usr_member');
    });
  });
});
