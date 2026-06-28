'use client';

import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import { LoadingState } from './Spinner';
import { EmptyState } from './EmptyState';

export type TableColumn<T> = {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  /** Tailwind width class, e.g. 'w-40'. */
  width?: string;
  render?: (row: T) => React.ReactNode;
  /** Hidden columns support the "column visibility toggle" requirement. */
  hidden?: boolean;
};

export type TableProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
};

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export function Table<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyAction,
  sortBy,
  sortDir,
  onSort,
  onRowClick,
}: TableProps<T>) {
  const visible = columns.filter((c) => !c.hidden);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2/50">
              {visible.map((col) => {
                const isSorted = sortBy === col.key;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted',
                      ALIGN[col.align ?? 'left'],
                      col.width,
                      col.sortable && onSort && 'cursor-pointer select-none hover:text-fg',
                    )}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <span className={cn('inline-flex items-center gap-1', col.align === 'right' && 'flex-row-reverse')}>
                      {col.header}
                      {col.sortable && isSorted && (
                        sortDir === 'asc' ? <CaretUp size={12} weight="bold" /> : <CaretDown size={12} weight="bold" />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {!loading &&
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-border last:border-0 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-surface-2/60',
                  )}
                >
                  {visible.map((col) => (
                    <td
                      key={col.key}
                      className={cn('px-4 py-3 text-fg', ALIGN[col.align ?? 'left'], col.width)}
                    >
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {loading && <LoadingState />}
      {!loading && rows.length === 0 && (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      )}
    </div>
  );
}
