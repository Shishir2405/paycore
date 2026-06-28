'use client';

import { forwardRef } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

export type SelectOption = { label: string; value: string; disabled?: boolean };

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  options: SelectOption[];
  invalid?: boolean;
  placeholder?: string;
};

/** Styled native <select> — accessible, keyboard-friendly, no JS dropdown to maintain. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, invalid, placeholder, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-10 w-full appearance-none rounded-md border bg-surface pl-3 pr-9 text-sm text-fg',
          'transition-colors focus:border-brand disabled:cursor-not-allowed disabled:opacity-60',
          invalid ? 'border-danger' : 'border-border',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <CaretDown
        weight="bold"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
});
