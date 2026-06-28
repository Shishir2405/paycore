'use client';

import { MagnifyingGlass } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import { Input } from './Input';

export type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Filter controls (Selects, DatePickers) rendered to the right of search. */
  filters?: React.ReactNode;
  /** Actions rendered far-right (e.g. Export, Add buttons). */
  actions?: React.ReactNode;
  className?: string;
};

/** Standard list toolbar: debounced search + module-specific filters + actions. */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  actions,
  className,
}: FilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            leadingIcon={<MagnifyingGlass size={16} />}
          />
        </div>
        {filters}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
