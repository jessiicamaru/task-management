import type { ProjectRole } from '../../lib/api-types';

export type ProjectAction =
  | 'project:edit'
  | 'project:delete'
  | 'member:add'
  | 'member:update_role'
  | 'member:remove'
  | 'member:leave'
  | 'project:transfer_ownership';

const ROLE_RANK: Record<ProjectRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export interface CanContext {
  targetUserId?: string | undefined;
  targetRole?: ProjectRole | undefined;
  currentUserId?: string | undefined;
  isLastOwner?: boolean | undefined;
  newRole?: ProjectRole | undefined;
}

/**
 * The UI hides; the server enforces.
 * Gating buttons and actions in the UI is a usability affordance, not a security boundary.
 * The server independently validates every request and returns 403 or 404 regardless.
 */
export function can(callerRole: ProjectRole, action: ProjectAction, context?: CanContext): boolean {
  const callerRank = ROLE_RANK[callerRole];

  switch (action) {
    case 'project:edit':
      return callerRank >= ROLE_RANK.admin;

    case 'project:delete':
      return callerRole === 'owner';

    case 'project:transfer_ownership':
      return callerRole === 'owner';

    case 'member:add':
      return callerRank >= ROLE_RANK.admin;

    case 'member:update_role': {
      if (callerRank < ROLE_RANK.admin) return false;
      // Cannot change own role
      if (
        context?.targetUserId &&
        context?.currentUserId &&
        context.targetUserId === context.currentUserId
      ) {
        return false;
      }
      // Cannot change owner role
      if (context?.targetRole === 'owner') return false;
      // Cannot set owner role directly (must use transfer)
      if (context?.newRole === 'owner') return false;
      // Admin cannot modify another admin or assign admin role
      if (callerRole === 'admin') {
        if (context?.targetRole === 'admin') return false;
        if (context?.newRole === 'admin') return false;
      }
      return true;
    }

    case 'member:remove': {
      if (context?.isLastOwner && context?.targetRole === 'owner') {
        return false;
      }
      // User leaving
      if (
        context?.targetUserId &&
        context?.currentUserId &&
        context.targetUserId === context.currentUserId
      ) {
        return !context.isLastOwner;
      }
      if (callerRank < ROLE_RANK.admin) return false;
      // Admin cannot remove owner or another admin
      if (
        callerRole === 'admin' &&
        (context?.targetRole === 'owner' || context?.targetRole === 'admin')
      ) {
        return false;
      }
      return true;
    }

    case 'member:leave':
      return !context?.isLastOwner;

    default:
      return false;
  }
}
