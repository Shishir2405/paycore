'use client';

import { forwardRef } from 'react';
import { CalendarBlank } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

export type DatePickerProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  invalid?: boolean;
};

/**
 * Styled native date input. Uses the platform date UI for reliability and
 * accessibility rather than a bespoke calendar popover.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { className, invalid, ...props },
  ref,
) {
  return (
    <div className="relative">
      <input
        ref={ref}
        type="date"
        className={cn(
          'h-10 w-full rounded-md border bg-surface px-3 pr-9 text-sm text-fg',
          'transition-colors focus:border-brand disabled:cursor-not-allowed disabled:opacity-60',
          '[&::-webkit-calendar-picker-indicator]:opacity-0',
          invalid ? 'border-danger' : 'border-border',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      />
      <CalendarBlank
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
});
