'use client';

import { DownloadSimple } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import type { BankFile } from '@/lib/api/finance';
import { Badge, Pagination, Table, type TableColumn } from '@/components/ui';

const inr = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** Read-only list of generated NEFT/RTGS bank files. Files are produced by payroll runs. */
export function BankFilesTab() {
  const list = useList<BankFile>('/bank-files', { initialSortBy: 'generatedAt', initialSortDir: 'desc' });

  const columns: TableColumn<BankFile>[] = [
    {
      key: 'fileName',
      header: 'File',
      render: (f) => <span className="font-medium text-fg">{f.fileName}</span>,
    },
    { key: 'format', header: 'Format', render: (f) => <Badge tone="info">{f.format}</Badge> },
    { key: 'recordCount', header: 'Records', align: 'right', render: (f) => f.recordCount },
    { key: 'totalAmount', header: 'Total (₹)', align: 'right', render: (f) => inr(f.totalAmount) },
    { key: 'generatedAt', header: 'Generated', render: (f) => fmtDate(f.generatedAt) },
    {
      key: 'download',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (f) =>
        f.fileUrl ? (
          <a
            href={f.fileUrl}
            className="inline-flex rounded p-1 text-muted hover:bg-surface-2 hover:text-fg"
            aria-label="Download bank file"
          >
            <DownloadSimple size={18} />
          </a>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      {list.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {list.error}
        </div>
      ) : (
        <Table
          columns={columns}
          rows={list.rows}
          rowKey={(f) => f.id}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          emptyTitle="No bank files yet"
          emptyDescription="NEFT/RTGS files are generated when you finalise a payroll run."
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}
    </div>
  );
}
