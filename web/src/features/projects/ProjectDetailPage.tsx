import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  Crown,
  Edit2,
  LogOut,
  Mail,
  MoreVertical,
  Plus,
  Shield,
  Trash2,
  UserMinus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { z } from 'zod';

import { can } from './permissions';
import {
  useAddMember,
  useDeleteProject,
  useLeaveProject,
  useProject,
  useProjectMembers,
  useRemoveMember,
  useTransferOwnership,
  useUpdateMemberRole,
  useUpdateProject,
} from './projects-api';
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '../../components/ui';
import { ApiError } from '../../lib/api-client';
import type { ProjectMember, ProjectRole } from '../../lib/api-types';
import { useAuth } from '../auth/session';

const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email is required'),
  role: z.enum(['admin', 'member', 'viewer']),
});

type AddMemberFormData = z.infer<typeof addMemberSchema>;

const editProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(100),
  description: z.string().trim().max(1000).optional(),
});

type EditProjectFormData = z.infer<typeof editProjectSchema>;

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'members'>('overview');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [memberToTransfer, setMemberToTransfer] = useState<ProjectMember | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedRole, setSelectedRole] = useState<'admin' | 'member' | 'viewer'>('member');

  const {
    data: project,
    isLoading: isProjectLoading,
    isError: isProjectError,
    error: projectError,
  } = useProject(projectId);
  const { data: members = [], isLoading: isMembersLoading } = useProjectMembers(projectId);

  const updateProjectMutation = useUpdateProject(projectId ?? '');
  const deleteProjectMutation = useDeleteProject();
  const addMemberMutation = useAddMember(projectId ?? '');
  const updateMemberRoleMutation = useUpdateMemberRole(projectId ?? '');
  const removeMemberMutation = useRemoveMember(projectId ?? '');
  const leaveProjectMutation = useLeaveProject(projectId ?? '');
  const transferOwnershipMutation = useTransferOwnership(projectId ?? '');

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditProjectFormData>({
    resolver: zodResolver(editProjectSchema),
    values: {
      name: project?.name ?? '',
      description: project?.description ?? '',
    },
  });

  const {
    register: registerMember,
    handleSubmit: handleMemberSubmit,
    reset: resetMember,
    setValue: setMemberValue,
    formState: { errors: memberErrors },
  } = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: '', role: 'member' },
  });

  const callerRole: ProjectRole = project?.role ?? 'viewer';
  const ownerCount = members.filter((m: ProjectMember) => m.role === 'owner').length;
  const isCallerLastOwner = callerRole === 'owner' && ownerCount <= 1;

  const onEditSave = async (formData: EditProjectFormData) => {
    try {
      await updateProjectMutation.mutateAsync({
        name: formData.name,
        description: formData.description || null,
      });
      setIsEditOpen(false);
      showToast({
        type: 'success',
        title: 'Project updated',
        description: 'Changes have been saved successfully.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not update project',
        description: err instanceof ApiError ? err.message : 'Update failed',
      });
    }
  };

  const onAddMemberSubmit = async (formData: AddMemberFormData) => {
    try {
      await addMemberMutation.mutateAsync({
        email: formData.email,
        role: selectedRole,
      });
      setIsAddMemberOpen(false);
      resetMember();
      setSelectedRole('member');
      showToast({
        type: 'success',
        title: 'Member added',
        description: `${formData.email} was added as ${selectedRole}.`,
      });
    } catch (err) {
      let desc = 'Failed to add member.';
      if (err instanceof ApiError) {
        if (err.code === 'user_not_found') {
          desc = 'No user account exists with this email address.';
        } else if (err.code === 'member_already_exists') {
          desc = 'This user is already a member of the project.';
        } else {
          desc = err.message;
        }
      }
      showToast({
        type: 'error',
        title: 'Could not add member',
        description: desc,
      });
    }
  };

  const handleRoleChange = async (member: ProjectMember, newRole: ProjectRole) => {
    try {
      await updateMemberRoleMutation.mutateAsync({ userId: member.id, role: newRole });
      showToast({
        type: 'success',
        title: 'Role updated',
        description: `${member.name}'s role was updated to ${newRole}.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not update role',
        description: err instanceof ApiError ? err.message : 'Role update failed',
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await removeMemberMutation.mutateAsync(memberToRemove.id);
      showToast({
        type: 'success',
        title: 'Member removed',
        description: `${memberToRemove.name} was removed from the project.`,
      });
      setMemberToRemove(null);
    } catch (err) {
      let desc = 'Failed to remove member.';
      if (err instanceof ApiError && err.code === 'last_owner') {
        desc = 'Cannot remove the last owner. Transfer ownership to another member first.';
      } else if (err instanceof ApiError) {
        desc = err.message;
      }
      showToast({
        type: 'error',
        title: 'Could not remove member',
        description: desc,
      });
    }
  };

  const handleLeaveProject = async () => {
    try {
      await leaveProjectMutation.mutateAsync();
      showToast({
        type: 'success',
        title: 'Left project',
        description: `You have left ${project?.name ?? 'the project'}.`,
      });
      void navigate('/projects');
    } catch (err) {
      let desc = 'Failed to leave project.';
      if (err instanceof ApiError && err.code === 'last_owner') {
        desc =
          'You cannot leave as the last owner of the project. Please transfer ownership to another member first.';
      } else if (err instanceof ApiError) {
        desc = err.message;
      }
      showToast({
        type: 'error',
        title: 'Could not leave project',
        description: desc,
      });
    }
  };

  const handleTransferOwnership = async () => {
    if (!memberToTransfer) return;
    try {
      await transferOwnershipMutation.mutateAsync(memberToTransfer.id);
      showToast({
        type: 'success',
        title: 'Ownership transferred',
        description: `${memberToTransfer.name} is now the project owner. Your role has been changed to admin.`,
      });
      setMemberToTransfer(null);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not transfer ownership',
        description: err instanceof ApiError ? err.message : 'Transfer failed',
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    try {
      await deleteProjectMutation.mutateAsync(project.id);
      showToast({
        type: 'success',
        title: 'Project deleted',
        description: `Project "${project.name}" was permanently deleted.`,
      });
      void navigate('/projects');
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not delete project',
        description: err instanceof ApiError ? err.message : 'Delete failed',
      });
    }
  };

  if (isProjectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="rounded-lg border border-border bg-surface p-6 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
    );
  }

  if (isProjectError || !project) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 p-8 text-center">
        <AlertCircle className="h-10 w-10 text-danger mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-fg">Project Not Found</h2>
        <p className="text-sm text-fg-muted mt-1 max-w-md mx-auto">
          {projectError instanceof ApiError
            ? projectError.message
            : 'The project you requested does not exist or you do not have permission to view it.'}
        </p>
        <Link to="/projects" className="inline-block mt-4">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/projects"
          className="inline-flex items-center text-sm font-medium text-fg-muted hover:text-fg focus:outline-none"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Projects
        </Link>
      </div>

      {/* Project Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border border-border bg-surface p-6 shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-fg">{project.name}</h1>
            <Badge variant={project.role === 'owner' ? 'default' : 'secondary'}>
              {project.role}
            </Badge>
          </div>
          <p className="text-sm text-fg-muted max-w-2xl">
            {project.description || 'No description provided.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {can(callerRole, 'project:edit') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetEdit({ name: project.name, description: project.description ?? '' });
                setIsEditOpen(true);
              }}
            >
              <Edit2 className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          )}

          {can(callerRole, 'member:leave', { isLastOwner: isCallerLastOwner }) && (
            <Button
              variant="outline"
              size="sm"
              className="text-danger hover:bg-danger/10"
              onClick={() => setIsLeaveOpen(true)}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Leave
            </Button>
          )}

          {can(callerRole, 'project:delete') && (
            <Button variant="destructive" size="sm" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Project
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'overview'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`py-3 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              activeTab === 'members'
                ? 'border-accent text-accent font-semibold'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <Users className="h-4 w-4" />
            Members ({members.length})
          </button>
        </nav>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-surface p-5">
            <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
              Total Members
            </span>
            <p className="text-2xl font-bold text-fg mt-2">
              {project.memberCount ?? members.length}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-5">
            <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
              Open Tasks
            </span>
            <p className="text-2xl font-bold text-fg mt-2">
              {(project.taskCounts?.todo ?? 0) + (project.taskCounts?.inProgress ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-5">
            <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
              Completed Tasks
            </span>
            <p className="text-2xl font-bold text-success mt-2">{project.taskCounts?.done ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-5">
            <span className="text-xs font-medium text-fg-muted uppercase tracking-wider">
              Total Tasks
            </span>
            <p className="text-2xl font-bold text-fg mt-2">{project.taskCounts?.total ?? 0}</p>
          </div>
        </div>
      )}

      {/* Tab: Members */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-fg">Project Collaborators</h2>
            {can(callerRole, 'member:add') && (
              <Button size="sm" onClick={() => setIsAddMemberOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Member
              </Button>
            )}
          </div>

          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted border-b border-border text-xs uppercase text-fg-muted">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">
                    Joined
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isMembersLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-fg-muted">
                      Loading members...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-fg-muted">
                      No members in this project.
                    </td>
                  </tr>
                ) : (
                  members.map((member: ProjectMember) => {
                    const isSelf = member.id === currentUser?.id;
                    const isTargetLastOwner = member.role === 'owner' && ownerCount <= 1;

                    return (
                      <tr key={member.id} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-fg flex items-center gap-3">
                          <Avatar name={member.name} size="sm" />
                          <div>
                            <span className="block font-medium">{member.name}</span>
                            {isSelf && <span className="text-xs text-fg-subtle">(you)</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-fg-muted">{member.email}</td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              member.role === 'owner'
                                ? 'default'
                                : member.role === 'admin'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {member.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-fg-subtle text-xs">
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Change Role options */}
                              {can(callerRole, 'member:update_role', {
                                targetUserId: member.id,
                                targetRole: member.role,
                                currentUserId: currentUser?.id,
                                newRole: 'admin',
                              }) &&
                                member.role !== 'admin' && (
                                  <DropdownMenuItem
                                    onClick={() => void handleRoleChange(member, 'admin')}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Make Admin
                                  </DropdownMenuItem>
                                )}

                              {can(callerRole, 'member:update_role', {
                                targetUserId: member.id,
                                targetRole: member.role,
                                currentUserId: currentUser?.id,
                                newRole: 'member',
                              }) &&
                                member.role !== 'member' && (
                                  <DropdownMenuItem
                                    onClick={() => void handleRoleChange(member, 'member')}
                                  >
                                    <Users className="h-4 w-4 mr-2" />
                                    Make Member
                                  </DropdownMenuItem>
                                )}

                              {can(callerRole, 'member:update_role', {
                                targetUserId: member.id,
                                targetRole: member.role,
                                currentUserId: currentUser?.id,
                                newRole: 'viewer',
                              }) &&
                                member.role !== 'viewer' && (
                                  <DropdownMenuItem
                                    onClick={() => void handleRoleChange(member, 'viewer')}
                                  >
                                    Make Viewer
                                  </DropdownMenuItem>
                                )}

                              {/* Transfer Ownership */}
                              {can(callerRole, 'project:transfer_ownership') &&
                                member.id !== currentUser?.id && (
                                  <DropdownMenuItem
                                    onClick={() => setMemberToTransfer(member)}
                                    className="text-accent"
                                  >
                                    <Crown className="h-4 w-4 mr-2" />
                                    Transfer Ownership
                                  </DropdownMenuItem>
                                )}

                              {/* Remove Member */}
                              {can(callerRole, 'member:remove', {
                                targetUserId: member.id,
                                targetRole: member.role,
                                currentUserId: currentUser?.id,
                                isLastOwner: isTargetLastOwner,
                              }) && (
                                <DropdownMenuItem
                                  onClick={() => setMemberToRemove(member)}
                                  className="text-danger focus:text-danger"
                                >
                                  <UserMinus className="h-4 w-4 mr-2" />
                                  Remove from Project
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update the name and description of your project.</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              void handleEditSubmit(onEditSave)(e);
            }}
            className="space-y-4"
          >
            <Input
              label="Project Name"
              error={editErrors.name?.message}
              {...registerEdit('name')}
            />

            <Textarea
              label="Description"
              rows={3}
              error={editErrors.description?.message}
              {...registerEdit('description')}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={updateProjectMutation.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Invite an existing user to collaborate on this project by entering their email
              address.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              void handleMemberSubmit(onAddMemberSubmit)(e);
            }}
            className="space-y-4"
          >
            <Input
              label="Email Address"
              type="email"
              placeholder="colleague@example.com"
              error={memberErrors.email?.message}
              {...registerMember('email')}
            />

            <Select
              label="Role"
              value={selectedRole}
              onValueChange={(val) => {
                const nextRole = val as 'admin' | 'member' | 'viewer';
                setSelectedRole(nextRole);
                setMemberValue('role', nextRole);
              }}
              options={
                callerRole === 'owner'
                  ? [
                      { value: 'viewer', label: 'Viewer - Read-only access' },
                      { value: 'member', label: 'Member - Can create and manage tasks' },
                      { value: 'admin', label: 'Admin - Can manage tasks and members' },
                    ]
                  : [
                      { value: 'viewer', label: 'Viewer - Read-only access' },
                      { value: 'member', label: 'Member - Can create and manage tasks' },
                    ]
              }
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={addMemberMutation.isPending}>
                <Mail className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <Dialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-danger">Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <strong className="text-fg">{memberToRemove?.name}</strong> from this project?
              <br />
              They will immediately lose access to all tasks and project resources.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleRemoveMember()}
              loading={removeMemberMutation.isPending}
            >
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Project Confirmation Dialog */}
      <Dialog open={isLeaveOpen} onOpenChange={setIsLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Project</DialogTitle>
            <DialogDescription>
              {isCallerLastOwner ? (
                <span className="text-danger">
                  You are the only owner of this project. You must transfer ownership to another
                  member before leaving.
                </span>
              ) : (
                <>
                  Are you sure you want to leave <strong className="text-fg">{project.name}</strong>
                  ? You will lose access to this project.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeaveOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isCallerLastOwner}
              onClick={() => void handleLeaveProject()}
              loading={leaveProjectMutation.isPending}
            >
              Leave Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Confirmation Dialog */}
      <Dialog
        open={Boolean(memberToTransfer)}
        onOpenChange={(open) => !open && setMemberToTransfer(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-accent flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Transfer Ownership
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to transfer ownership of this project to{' '}
              <strong className="text-fg">{memberToTransfer?.name}</strong>?
              <br />
              <span className="block mt-2 font-medium text-warning">
                Important: You will become an Admin and will no longer have owner privileges. You
                will not be able to undo this action alone.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToTransfer(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleTransferOwnership()}
              loading={transferOwnershipMutation.isPending}
            >
              Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-danger">Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong className="text-fg">{project.name}</strong>?
              <br />
              <span className="text-danger font-medium block mt-2">
                Warning: Deleting this project will permanently remove all tasks, comments, and
                member associations. This action cannot be reversed.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteProject()}
              loading={deleteProjectMutation.isPending}
            >
              Delete Project Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
