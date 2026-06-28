'use client';

import { useState } from 'react';
import { Plus, DotsThreeVertical, ListBullets, XCircle, Trash, Money } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { loansApi, type Loan } from '@/lib/api/benefits';
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
import { LoanFormModal } from './LoanFormModal';
import { LoanScheduleModal } from './LoanScheduleModal';
import { inr, STATUS_TONE } from './format';

export function LoansTab() {
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const [status, setStatus] = useState('');
  const list = useList<Loan>('/loans', {
    initialSortBy: 'createdAt',
    initialSortDir: 'desc',
    filters: { status: status || undefined },
  });

  const [formOpen, setFormOpen] = useState(false);
  const [scheduleFor, setScheduleFor] = useState<Loan | null>(null);

  async function handleClose(loan: Loan) {
    if (!confirm(`Mark this loan as Closed? Outstanding ${inr(loan.outstanding)} will no longer be recovered.`)) return;
    try {
      await loansApi.update(loan.id, { status: 'Closed' });
      toast.success('Loan closed');
      list.refetch();
    } catch (err) {
      toast.error('Could not close loan', err instanceof ApiError ? err.message : undefined);
    }
  }

  async function handleDelete(loan: Loan) {
    if (!confirm('Delete this loan and its schedule? This can be restored by an admin.')) return;
    try {
      await loansApi.remove(loan.id);
      toast.success('Loan deleted');
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  const columns: TableColumn<Loan>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (l) => (
        <div>
          <p className="font-medium text-fg">{l.employee.fullName ?? '—'}</p>
          {l.employee.employeeCode && <p className="text-xs text-muted">{l.employee.employeeCode}</p>}
        </div>
      ),
    },
    { key: 'principal', header: 'Principal', align: 'right', render: (l) => inr(l.principal) },
    { key: 'emi', header: 'EMI', align: 'right', render: (l) => inr(l.emi) },
    { key: 'tenureMonths', header: 'Tenure', align: 'right', render: (l) => `${l.tenureMonths} mo` },
    {
      key: 'interestRatePa',
      header: 'Rate',
      align: 'right',
      render: (l) => <span className="text-fg-subtle">{l.interestRatePa}% p.a.</span>,
    },
    { key: 'outstanding', header: 'Outstanding', align: 'right', render: (l) => inr(l.outstanding) },
    {
      key: 'status',
      header: 'Status',
      render: (l) => (
        <Badge tone={STATUS_TONE[l.status] ?? 'neutral'} dot>
          {l.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (l) => (
        <Dropdown
          trigger={
            <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
              <DotsThreeVertical size={18} weight="bold" />
            </button>
          }
        >
          <DropdownItem icon={<ListBullets size={16} />} onClick={() => setScheduleFor(l)}>
            View schedule
          </DropdownItem>
          {can('benefits:edit') && l.status === 'Active' && (
            <DropdownItem icon={<XCircle size={16} />} onClick={() => handleClose(l)}>
              Close loan
            </DropdownItem>
          )}
          {can('benefits:delete') && (
            <DropdownItem icon={<Trash size={16} />} danger onClick={() => handleDelete(l)}>
              Delete
            </DropdownItem>
          )}
        </Dropdown>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search loans…"
        filters={
          <div className="w-36">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { label: 'All statuses', value: '' },
                { label: 'Active', value: 'Active' },
                { label: 'Closed', value: 'Closed' },
              ]}
            />
          </div>
        }
        actions={
          can('benefits:create') && (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => setFormOpen(true)}>
              New loan
            </Button>
          )
        }
      />

      {list.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{list.error}</div>
      ) : (
        <Table
          columns={columns}
          rows={list.rows}
          rowKey={(l) => l.id}
          loading={list.loading}
          emptyTitle="No loans yet"
          emptyDescription="Issue a staff loan or salary advance to get started."
          emptyAction={
            can('benefits:create') && (
              <Button icon={<Money size={16} weight="fill" />} onClick={() => setFormOpen(true)}>
                New loan
              </Button>
            )
          }
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <LoanFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => list.refetch()} />
      <LoanScheduleModal open={!!scheduleFor} loan={scheduleFor} onClose={() => setScheduleFor(null)} />
    </div>
  );
}
