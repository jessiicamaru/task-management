import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | undefined;
  label?: string | undefined;
  helperText?: string | undefined;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, helperText, id, disabled, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-fg">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-desc` : undefined}
          className={cn(
            'min-h-[80px] w-full rounded-md border bg-surface px-3 py-2 text-sm text-fg transition-colors placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-danger focus-visible:ring-danger'
              : 'border-border focus-visible:ring-accent',
            className,
          )}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-danger font-medium">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-desc`} className="text-xs text-fg-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
