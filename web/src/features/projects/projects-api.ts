import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../../lib/api-client';
import type {
  PaginationEnvelope,
  Project,
  ProjectDetail,
  ProjectMember,
  ProjectRole,
} from '../../lib/api-types';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (params?: { limit?: number | undefined; cursor?: string | undefined }) =>
    [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  members: (id: string) => [...projectKeys.detail(id), 'members'] as const,
};

export function useProjects(limit = 20, cursor?: string) {
  return useQuery({
    queryKey: projectKeys.list({ limit, cursor }),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (limit) queryParams.set('limit', String(limit));
      if (cursor) queryParams.set('cursor', cursor);

      const qs = queryParams.toString();
      const res = await apiClient.get<PaginationEnvelope<Project>>(
        `/projects${qs ? `?${qs}` : ''}`,
      );
      return res;
    },
  });
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(projectId ?? ''),
    queryFn: async () => {
      const res = await apiClient.get<{ project: ProjectDetail }>(`/projects/${projectId}`);
      return res.project;
    },
    enabled: Boolean(projectId),
  });
}

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: projectKeys.members(projectId ?? ''),
    queryFn: async () => {
      const res = await apiClient.get<{ members: ProjectMember[] }>(
        `/projects/${projectId}/members`,
      );
      return res.members;
    },
    enabled: Boolean(projectId),
  });
}

export interface CreateProjectInput {
  name: string;
  description?: string | null | undefined;
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      const res = await apiClient.post<{ project: Project }>('/projects', data);
      return res.project;
    },
    onMutate: async (newProject) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.all });

      const queryKey = projectKeys.list({ limit: 20 });
      const previousData = queryClient.getQueryData<PaginationEnvelope<Project>>(queryKey);

      if (previousData) {
        const optimisticProject: Project = {
          id: `temp-${Date.now()}`,
          name: newProject.name,
          description: newProject.description ?? null,
          role: 'owner',
          ownerId: 'optimistic',
          memberCount: 1,
          taskCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData<PaginationEnvelope<Project>>(queryKey, {
          ...previousData,
          data: [optimisticProject, ...previousData.data],
        });
      }

      return { previousData };
    },
    onError: (_err, _newProject, context) => {
      if (context?.previousData) {
        const queryKey = projectKeys.list({ limit: 20 });
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name?: string | undefined;
      description?: string | null | undefined;
    }) => {
      const res = await apiClient.patch<{ project: Project }>(`/projects/${projectId}`, data);
      return res.project;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      await apiClient.delete(`/projects/${projectId}`);
      return projectId;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useAddMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; role: ProjectRole }) => {
      const res = await apiClient.post<{ member: ProjectMember }>(
        `/projects/${projectId}/members`,
        data,
      );
      return res.member;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useUpdateMemberRole(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: ProjectRole }) => {
      const res = await apiClient.patch<{ member: ProjectMember }>(
        `/projects/${projectId}/members/${userId}`,
        { role },
      );
      return res.member;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/projects/${projectId}/members/${userId}`);
      return userId;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useLeaveProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/projects/${projectId}/members/me`);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useTransferOwnership(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.post(`/projects/${projectId}/transfer-ownership`, { userId });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
