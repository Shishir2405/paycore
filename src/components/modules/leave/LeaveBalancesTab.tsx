'use client';

import { useState } from 'react';
import { useList } from '@/hooks/useList';
import type { LeaveBalance } from '@/lib/api/leave';
import { Badge, FilterBar, Pagination, Select, Table, type TableColumn } from '@/components/ui';

function yearOptions(): { label: string; value: string }[] {
  const now = new Date().getFullYear();
  const years = [now + 1, now, now - 1, now - 2];
  return [{ label: 'All years', value: '' }, ...years.map((y) => ({ label: String(y), value: String(y) }))];
}

export function LeaveBalancesTab() {
  const [year, setYear] = useState('');
  const list = useList<LeaveBalance>('/leave-balances', {
    initialSortBy: 'year',
    initialSortDir: 'desc',
    filters: { year: year || undefined },
  });

  const columns: TableColumn<LeaveBalance>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      render: (b) => <span className="font-medium text-fg">{b.employeeName ?? '—'}</span>,
    },
    {
      key: 'leaveTypeName',
      header: 'Leave type',
      render: (b) => <span className="text-fg-subtle">{b.leaveTypeName ?? '—'}</span>,
    },
    { key: 'year', header: 'Year', sortable: true, width: 'w-20', render: (b) => `${b.year}` },
    {
      key: 'entitled',
      header: 'Entitled',
      align: 'right',
      render: (b) => <span className="font-mono text-xs">{b.entitled}</span>,
    },
    {
      key: 'used',
      header: 'Used',
      align: 'right',
      render: (b) => <span className="font-mono text-xs text-fg-subtle">{b.used}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (b) => (
        <Badge tone={b.balance > 0 ? 'success' : b.balance < 0 ? 'danger' : 'neutral'}>{b.balance}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search…"
        filters={
          <div className="w-32">
            <Select value={year} onChange={(e) => setYear(e.target.value)} options={yearOptions()} />
          </div>
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
          rowKey={(b) => b.id}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          emptyTitle="No leave balances yet"
          emptyDescription="Balances build up as leave types are configured and requests are approved."
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}
    </div>
  );
}
