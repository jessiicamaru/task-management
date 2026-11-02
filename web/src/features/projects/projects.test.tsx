import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { can } from './permissions';
import { ProjectDetailPage } from './ProjectDetailPage';
import { ProjectsListPage } from './ProjectsListPage';
import { Providers } from '../../app/providers';
import type { Project, ProjectDetail, ProjectMember } from '../../lib/api-types';

describe('Projects Feature', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('can() permissions helper', () => {
    it('allows owner to perform all operations', () => {
      expect(can('owner', 'project:edit')).toBe(true);
      expect(can('owner', 'project:delete')).toBe(true);
      expect(can('owner', 'project:transfer_ownership')).toBe(true);
      expect(can('owner', 'member:add')).toBe(true);
      expect(
        can('owner', 'member:update_role', {
          targetUserId: 'usr_2',
          currentUserId: 'usr_1',
          targetRole: 'member',
          newRole: 'admin',
        }),
      ).toBe(true);
      expect(
        can('owner', 'member:remove', {
          targetUserId: 'usr_2',
          currentUserId: 'usr_1',
          targetRole: 'member',
        }),
      ).toBe(true);
    });

    it('forbids admin from deleting project or transferring ownership', () => {
      expect(can('admin', 'project:edit')).toBe(true);
      expect(can('admin', 'project:delete')).toBe(false);
      expect(can('admin', 'project:transfer_ownership')).toBe(false);
      expect(can('admin', 'member:add')).toBe(true);
    });

    it('forbids admin from modifying another admin or owner', () => {
      expect(
        can('admin', 'member:update_role', {
          targetUserId: 'usr_2',
          currentUserId: 'usr_1',
          targetRole: 'admin',
          newRole: 'viewer',
        }),
      ).toBe(false);

      expect(
        can('admin', 'member:update_role', {
          targetUserId: 'usr_2',
          currentUserId: 'usr_1',
          targetRole: 'member',
          newRole: 'admin',
        }),
      ).toBe(false);

      expect(
        can('admin', 'member:remove', {
          targetUserId: 'usr_2',
          currentUserId: 'usr_1',
          targetRole: 'owner',
        }),
      ).toBe(false);
    });

    it('forbids self role modification', () => {
      expect(
        can('owner', 'member:update_role', {
          targetUserId: 'usr_1',
          currentUserId: 'usr_1',
          targetRole: 'owner',
          newRole: 'admin',
        }),
      ).toBe(false);
    });

    it('prevents removing the last owner', () => {
      expect(
        can('owner', 'member:remove', {
          targetUserId: 'usr_1',
          currentUserId: 'usr_1',
          targetRole: 'owner',
          isLastOwner: true,
        }),
      ).toBe(false);

      expect(can('owner', 'member:leave', { isLastOwner: true })).toBe(false);
      expect(can('owner', 'member:leave', { isLastOwner: false })).toBe(true);
    });

    it('forbids viewer and member from modifying project or members', () => {
      expect(can('viewer', 'project:edit')).toBe(false);
      expect(can('viewer', 'member:add')).toBe(false);
      expect(can('member', 'project:edit')).toBe(false);
      expect(can('member', 'member:add')).toBe(false);
    });
  });

  describe('ProjectsListPage', () => {
    it('shows empty state when caller has no projects', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [],
            pagination: { nextCursor: null, hasMore: false, limit: 20 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      render(
        <Providers>
          <MemoryRouter>
            <ProjectsListPage />
          </MemoryRouter>
        </Providers>,
      );

      await waitFor(() => {
        expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /create project/i })).toBeInTheDocument();
    });

    it('renders project cards with role badge and opens create dialog', async () => {
      const mockProject: Project = {
        id: 'prj_test_1',
        name: 'Alpha Redesign',
        description: 'Frontend overhaul',
        ownerId: 'usr_1',
        role: 'owner',
        memberCount: 3,
        taskCount: 8,
        createdAt: '2026-11-02T12:00:00.000Z',
        updatedAt: '2026-11-02T12:00:00.000Z',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [mockProject],
            pagination: { nextCursor: null, hasMore: false, limit: 20 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      render(
        <Providers>
          <MemoryRouter>
            <ProjectsListPage />
          </MemoryRouter>
        </Providers>,
      );

      await waitFor(() => {
        expect(screen.getByText('Alpha Redesign')).toBeInTheDocument();
      });

      expect(screen.getByText('Frontend overhaul')).toBeInTheDocument();
      expect(screen.getByText('owner')).toBeInTheDocument();
      expect(screen.getByText(/3 members/i)).toBeInTheDocument();
      expect(screen.getByText(/8 tasks/i)).toBeInTheDocument();

      // Open create dialog
      fireEvent.click(screen.getByRole('button', { name: /new project/i }));
      expect(screen.getByRole('heading', { name: /create new project/i })).toBeInTheDocument();
    });
  });

  describe('ProjectDetailPage', () => {
    it('renders project header, role badge and statistics', async () => {
      const mockDetail: ProjectDetail = {
        id: 'prj_test_1',
        name: 'Alpha Redesign',
        description: 'Detailed description',
        ownerId: 'usr_1',
        role: 'owner',
        memberCount: 2,
        taskCounts: { todo: 4, inProgress: 2, done: 5, archived: 1, total: 12 },
        createdAt: '2026-11-02T12:00:00.000Z',
        updatedAt: '2026-11-02T12:00:00.000Z',
      };

      const mockMembers: ProjectMember[] = [
        {
          id: 'usr_1',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          role: 'owner',
          joinedAt: '2026-11-02T12:00:00.000Z',
        },
        {
          id: 'usr_2',
          name: 'Charles Babbage',
          email: 'charles@example.com',
          role: 'member',
          joinedAt: '2026-11-02T12:00:00.000Z',
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('/members')) {
          return Promise.resolve(
            new Response(JSON.stringify({ members: mockMembers }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ project: mockDetail }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      });

      render(
        <Providers>
          <MemoryRouter initialEntries={['/projects/prj_test_1']}>
            <Routes>
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
            </Routes>
          </MemoryRouter>
        </Providers>,
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Alpha Redesign' })).toBeInTheDocument();
      });

      expect(screen.getByText('Detailed description')).toBeInTheDocument();
      expect(screen.getByText('owner')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument(); // total tasks

      // Switch to members tab
      fireEvent.click(screen.getByRole('button', { name: /members/i }));
      await waitFor(() => {
        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('charles@example.com')).toBeInTheDocument();
      });
    });
  });
});
