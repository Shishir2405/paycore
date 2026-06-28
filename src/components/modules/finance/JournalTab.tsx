'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, DotsThreeVertical, PencilSimple, Trash, DownloadSimple, Receipt } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { financeApi, type JournalEntry } from '@/lib/api/finance';
import { ApiError } from '@/lib/api/client';
import {
  Badge,
  Button,
  Dropdown,
  DropdownItem,
  FilterBar,
  Pagination,
  Select,
  Table,
  type TableColumn,
  useToast,
} from '@/components/ui';

const inr = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

const SOURCE_TONE: Record<string, 'info' | 'neutral'> = { Payroll: 'info', Manual: 'neutral' };

export function JournalTab() {
  const router = useRouter();
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const [source, setSource] = useState('');
  const list = useList<JournalEntry>('/journal-entries', {
    initialSortBy: 'date',
    initialSortDir: 'desc',
    filters: { source: source || undefined },
  });

  async function handleDelete(je: JournalEntry) {
    if (!confirm(`Delete voucher ${je.voucherNo}?`)) return;
    try {
      await financeApi.journals.remove(je.id);
      toast.success('Voucher deleted');
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  const columns: TableColumn<JournalEntry>[] = [
    {
      key: 'voucherNo',
      header: 'Voucher',
      sortable: true,
      width: 'w-28',
      render: (j) => <span className="font-mono text-xs text-fg-subtle">{j.voucherNo}</span>,
    },
    { key: 'date', header: 'Date', sortable: true, width: 'w-32', render: (j) => fmtDate(j.date) },
    {
      key: 'narration',
      header: 'Narration',
      render: (j) => (
        <div>
          <p className="font-medium text-fg">{j.narration}</p>
          <p className="text-xs text-muted">{j.lines.length} lines</p>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (j) => <Badge tone={SOURCE_TONE[j.source] ?? 'neutral'}>{j.source}</Badge>,
    },
    { key: 'totalDebit', header: 'Amount (₹)', align: 'right', render: (j) => inr(j.totalDebit) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (j) =>
        can('finance:create') && (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            <DropdownItem icon={<PencilSimple size={16} />} onClick={() => router.push(`/finance/journal/${j.id}/edit`)}>
              Edit
            </DropdownItem>
            <DropdownItem icon={<Trash size={16} />} danger onClick={() => handleDelete(j)}>
              Delete
            </DropdownItem>
          </Dropdown>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search by voucher or narration…"
        filters={
          <div className="w-40">
            <Select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              options={[
                { label: 'All sources', value: '' },
                { label: 'Payroll', value: 'Payroll' },
                { label: 'Manual', value: 'Manual' },
              ]}
            />
          </div>
        }
        actions={
          <>
            {can('finance:export') && (
              <Button
                variant="outline"
                icon={<DownloadSimple size={16} />}
                onClick={() =>
                  window.open(
                    financeApi.journals.exportUrl({ source: source || undefined, search: list.search }),
                    '_blank',
                  )
                }
              >
                Export Tally
              </Button>
            )}
            {can('finance:create') && (
              <Button icon={<Plus size={16} weight="bold" />} onClick={() => router.push('/finance/journal/new')}>
                New Voucher
              </Button>
            )}
          </>
        }
      />

      {list.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {list.error}
        </div>
      ) : (
        <Table
          columns={columns}
          rows={list.rows}
          rowKey={(j) => j.id}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          emptyTitle="No journal vouchers yet"
          emptyDescription="Vouchers post payroll cost to the ledger. Create one manually or run payroll."
          emptyAction={
            can('finance:create') && (
              <Button icon={<Receipt size={16} weight="fill" />} onClick={() => router.push('/finance/journal/new')}>
                New Voucher
              </Button>
            )
          }
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}
    </div>
  );
}
