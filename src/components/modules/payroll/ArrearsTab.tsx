'use client';

import { useState } from 'react';
import { Plus, DotsThreeVertical, PencilSimple, Trash } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { payrollApi, type Arrear } from '@/lib/api/payroll';
import { ApiError } from '@/lib/api/client';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ArrearFormModal } from './ArrearFormModal';
import {
  Badge,
  Button,
  Dropdown,
  DropdownItem,
  FilterBar,
  Pagination,
  Table,
  type TableColumn,
  useToast,
} from '@/components/ui';
import { inr, MONTH_OPTIONS } from './format';

export function ArrearsTab() {
  const toast = useToast();
  const can = useAuth((s) => s.can);
  const list = useList<Arrear>('/arrears', { initialSortBy: 'createdAt', initialSortDir: 'desc' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Arrear | null>(null);
  const [toDelete, setToDelete] = useState<Arrear | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await payrollApi.arrears.remove(toDelete.id);
      toast.success('Arrear deleted');
      setToDelete(null);
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  const monthName = (m: number) => MONTH_OPTIONS.find((o) => o.value === String(m))?.label ?? m;

  const columns: TableColumn<Arrear>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (a) => (
        <div>
          <p className="font-medium text-fg">{a.employee.fullName ?? a.employee.id}</p>
          {a.employee.employeeCode && <p className="font-mono text-xs text-muted">{a.employee.employeeCode}</p>}
        </div>
      ),
    },
    { key: 'period', header: 'Period', render: (a) => `${monthName(a.month)} ${a.year}` },
    { key: 'amount', header: 'Amount', align: 'right', render: (a) => inr(a.amount) },
    { key: 'reason', header: 'Reason', render: (a) => <span className="text-fg-subtle">{a.reason}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <Badge tone={a.status === 'Processed' ? 'success' : 'warning'}>{a.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (a) =>
        can('payroll:edit') && (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            <DropdownItem icon={<PencilSimple size={16} />} onClick={() => { setEditing(a); setFormOpen(true); }}>
              Edit
            </DropdownItem>
            <DropdownItem icon={<Trash size={16} />} danger onClick={() => setToDelete(a)}>
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
        searchPlaceholder="Search arrears…"
        actions={
          can('payroll:create') && (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
              Add Arrear
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
          rowKey={(a) => a.id}
          loading={list.loading}
          emptyTitle="No arrears"
          emptyDescription="Back-dated pay adjustments appear here and are picked up by payroll."
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <ArrearFormModal open={formOpen} arrear={editing} onClose={() => setFormOpen(false)} onSaved={() => list.refetch()} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete arrear?"
        message={toDelete ? `This arrear of ${inr(toDelete.amount)} will be removed.` : undefined}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
