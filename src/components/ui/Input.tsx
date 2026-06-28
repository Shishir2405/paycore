'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  /** Phosphor icon rendered inside the field, left-aligned. */
  leadingIcon?: React.ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, leadingIcon, ...props },
  ref,
) {
  return (
    <div className="relative">
      {leadingIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          {leadingIcon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-md border bg-surface px-3 text-sm text-fg placeholder:text-muted',
          'transition-colors focus:border-brand disabled:cursor-not-allowed disabled:opacity-60',
          !!leadingIcon && 'pl-9',
          invalid ? 'border-danger' : 'border-border',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
    </div>
  );
});
