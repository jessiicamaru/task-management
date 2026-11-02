import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { Spinner } from './Spinner';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none min-h-[44px] cursor-pointer';

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-accent text-accent-fg hover:bg-accent-hover active:opacity-90',
      secondary: 'bg-surface-muted text-fg hover:bg-surface-hover',
      outline: 'border border-border bg-surface text-fg hover:bg-surface-muted',
      ghost: 'bg-transparent text-fg hover:bg-surface-muted',
      destructive: 'bg-danger text-danger-fg hover:bg-danger-hover',
      link: 'text-accent underline-offset-4 hover:underline p-0 min-h-0 h-auto',
    };

    const sizes: Record<ButtonSize, string> = {
      sm: 'text-xs px-3 py-1.5 h-9 min-h-[36px]',
      md: 'text-sm px-4 py-2 h-11 min-h-[44px]',
      lg: 'text-base px-6 py-3 h-12 min-h-[48px]',
      icon: 'h-11 w-11 min-h-[44px] min-w-[44px] p-0',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Spinner size="sm" className="shrink-0" />
            <span className="opacity-70">{children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
