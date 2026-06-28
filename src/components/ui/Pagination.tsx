'use client';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import type { PageMeta } from '@/lib/utils/api-response';

export type PaginationProps = {
  meta: PageMeta;
  onPageChange: (page: number) => void;
};

/** Compact pager with first/prev/next/last and a "showing X–Y of Z" summary. */
export function Pagination({ meta, onPageChange }: PaginationProps) {
  const { page, limit, total, totalPages, hasNext, hasPrev } = meta;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 py-3 sm:flex-row">
      <p className="text-sm text-muted">
        Showing <span className="font-medium text-fg">{from}</span>–
        <span className="font-medium text-fg">{to}</span> of{' '}
        <span className="font-medium text-fg">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <PagerButton disabled={!hasPrev} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <CaretLeft size={16} weight="bold" />
        </PagerButton>
        <span className="px-3 text-sm text-fg-subtle">
          Page <span className="font-medium text-fg">{page}</span> of {totalPages}
        </span>
        <PagerButton disabled={!hasNext} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <CaretRight size={16} weight="bold" />
        </PagerButton>
      </div>
    </div>
  );
}

function PagerButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-fg-subtle transition-colors',
        'hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    />
  );
}
