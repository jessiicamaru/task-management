import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, FolderKanban, Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';

import { can } from './permissions';
import { useCreateProject, useDeleteProject, useProjects } from './projects-api';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Skeleton,
  Textarea,
  useToast,
} from '../../components/ui';
import { ApiError } from '../../lib/api-client';
import type { Project } from '../../lib/api-types';

const createProjectFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be under 100 characters'),
  description: z.string().trim().max(1000, 'Description must be under 1000 characters').optional(),
});

type CreateProjectFormData = z.infer<typeof createProjectFormSchema>;

export function ProjectsListPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const { data, isLoading, isError, error, refetch } = useProjects();
  const createMutation = useCreateProject();
  const deleteMutation = useDeleteProject();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: { name: '', description: '' },
  });

  const onCreateSubmit = async (formData: CreateProjectFormData) => {
    try {
      const newProject = await createMutation.mutateAsync({
        name: formData.name,
        description: formData.description || null,
      });
      setIsCreateOpen(false);
      reset();
      showToast({
        type: 'success',
        title: 'Project created',
        description: `Project "${newProject.name}" has been created.`,
      });
      void navigate(`/projects/${newProject.id}`);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to create project. Please try again.';
      const reqId = err instanceof ApiError ? err.requestId : undefined;
      showToast({
        type: 'error',
        title: 'Could not create project',
        description: message,
        requestId: reqId,
      });
    }
  };

  const onDeleteConfirm = async () => {
    if (!projectToDelete) return;
    try {
      await deleteMutation.mutateAsync(projectToDelete.id);
      showToast({
        type: 'success',
        title: 'Project deleted',
        description: `Project "${projectToDelete.name}" was permanently deleted.`,
      });
      setProjectToDelete(null);
    } catch (err) {
      const reqId = err instanceof ApiError ? err.requestId : undefined;
      showToast({
        type: 'error',
        title: 'Could not delete project',
        description: err instanceof ApiError ? err.message : 'Failed to delete project',
        requestId: reqId,
      });
    }
  };

  const projects: Project[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Projects</h1>
          <p className="text-sm text-fg-muted mt-1">
            Manage your workspaces, track tasks and collaborate with teammates.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="sm:self-start">
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-lg border border-border bg-surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex items-center gap-4 pt-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-danger mx-auto mb-2" />
          <h3 className="text-base font-semibold text-fg">Failed to load projects</h3>
          <p className="text-sm text-fg-muted mt-1">
            {error instanceof ApiError ? error.message : 'An unexpected error occurred.'}
          </p>
          {error instanceof ApiError && error.requestId && (
            <p className="text-xs text-fg-subtle mt-1 font-mono">Request ID: {error.requestId}</p>
          )}
          <Button variant="outline" size="sm" onClick={() => void refetch()} className="mt-4">
            Try again
          </Button>
        </div>
      )}

      {!isLoading && !isError && projects.length === 0 && (
        <EmptyState
          icon={<FolderKanban className="h-8 w-8 text-fg-muted" />}
          title="No projects yet"
          description="Projects organize your tasks and allow you to collaborate with team members. Create your first project to get started."
          action={
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          }
        />
      )}

      {!isLoading && !isError && projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: Project) => (
            <div
              key={project.id}
              className="group relative flex flex-col justify-between rounded-lg border border-border bg-surface p-5 transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/projects/${project.id}`}
                    className="font-semibold text-fg hover:text-accent focus:outline-none focus:underline"
                  >
                    {project.name}
                  </Link>
                  <Badge variant={project.role === 'owner' ? 'default' : 'secondary'}>
                    {project.role}
                  </Badge>
                </div>
                <p className="text-sm text-fg-muted mt-2 line-clamp-2">
                  {project.description || 'No description provided.'}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-fg-subtle">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {project.memberCount ?? 1} {project.memberCount === 1 ? 'member' : 'members'}
                  </span>
                  <span>•</span>
                  <span>{project.taskCount ?? 0} tasks</span>
                </div>

                {can(project.role, 'project:delete') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/10 p-1.5 h-auto"
                    onClick={(e) => {
                      e.preventDefault();
                      setProjectToDelete(project);
                    }}
                    aria-label={`Delete ${project.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a workspace to start organizing tasks with your team.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              void handleSubmit(onCreateSubmit)(e);
            }}
            className="space-y-4"
          >
            <Input
              label="Project Name"
              placeholder="e.g. Website Redesign"
              error={errors.name?.message}
              {...register('name')}
            />

            <Textarea
              label="Description (optional)"
              placeholder="What is this project about?"
              rows={3}
              error={errors.description?.message}
              {...register('description')}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-danger">Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong className="text-fg">{projectToDelete?.name}</strong>?
              <br />
              <span className="text-danger font-medium block mt-2">
                Warning: Deleting this project will permanently remove all associated tasks,
                comments, and member assignments. This action cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProjectToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void onDeleteConfirm();
              }}
              loading={deleteMutation.isPending}
            >
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
