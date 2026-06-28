'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'w-full rounded-md border bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted',
        'transition-colors focus:border-brand disabled:cursor-not-allowed disabled:opacity-60',
        invalid ? 'border-danger' : 'border-border',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});
