import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Ban,
  CheckCircle2,
  Clock,
  ListTodo,
} from 'lucide-react';
import { type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/utils';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'danger' | 'warning' | 'success';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-accent text-accent-fg',
    secondary: 'bg-surface-muted text-fg-muted',
    outline: 'border border-border text-fg',
    danger: 'bg-danger-muted text-danger font-medium',
    warning: 'bg-warning-muted text-warning-fg font-medium',
    success: 'bg-success-muted text-success-fg font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';

const statusConfig: Record<
  TaskStatus,
  { label: string; variant: BadgeVariant; icon: typeof ListTodo }
> = {
  todo: { label: 'To Do', variant: 'secondary', icon: ListTodo },
  in_progress: { label: 'In Progress', variant: 'default', icon: Clock },
  blocked: { label: 'Blocked', variant: 'danger', icon: Ban },
  done: { label: 'Done', variant: 'success', icon: CheckCircle2 },
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const conf = statusConfig[status] ?? statusConfig.todo;
  const Icon = conf.icon;

  return (
    <Badge variant={conf.variant} className={className}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{conf.label}</span>
    </Badge>
  );
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

const priorityConfig: Record<
  TaskPriority,
  { label: string; variant: BadgeVariant; icon: typeof ArrowDown }
> = {
  low: { label: 'Low', variant: 'secondary', icon: ArrowDown },
  medium: { label: 'Medium', variant: 'outline', icon: AlertTriangle },
  high: { label: 'High', variant: 'warning', icon: ArrowUp },
  urgent: { label: 'Urgent', variant: 'danger', icon: AlertCircle },
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  const conf = priorityConfig[priority] ?? priorityConfig.medium;
  const Icon = conf.icon;

  return (
    <Badge variant={conf.variant} className={className}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span>{conf.label}</span>
    </Badge>
  );
}
