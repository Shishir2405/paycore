'use client';

import { useState } from 'react';
import { Plus, DotsThreeVertical, PencilSimple, Trash } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { payrollApi, type Bonus } from '@/lib/api/payroll';
import { ApiError } from '@/lib/api/client';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { BonusFormModal } from './BonusFormModal';
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

export function BonusesTab() {
  const toast = useToast();
  const can = useAuth((s) => s.can);
  const list = useList<Bonus>('/bonuses', { initialSortBy: 'createdAt', initialSortDir: 'desc' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Bonus | null>(null);
  const [toDelete, setToDelete] = useState<Bonus | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await payrollApi.bonuses.remove(toDelete.id);
      toast.success('Bonus deleted');
      setToDelete(null);
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  const monthName = (m: number) => MONTH_OPTIONS.find((o) => o.value === String(m))?.label ?? m;

  const columns: TableColumn<Bonus>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (b) => (
        <div>
          <p className="font-medium text-fg">{b.employee.fullName ?? b.employee.id}</p>
          {b.employee.employeeCode && <p className="font-mono text-xs text-muted">{b.employee.employeeCode}</p>}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (b) => <Badge tone={b.type === 'Statutory' ? 'info' : 'neutral'}>{b.type}</Badge>,
    },
    { key: 'period', header: 'Period', render: (b) => `${monthName(b.month)} ${b.year}` },
    { key: 'amount', header: 'Amount', align: 'right', render: (b) => inr(b.amount) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (b) =>
        can('payroll:edit') && (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            <DropdownItem icon={<PencilSimple size={16} />} onClick={() => { setEditing(b); setFormOpen(true); }}>
              Edit
            </DropdownItem>
            <DropdownItem icon={<Trash size={16} />} danger onClick={() => setToDelete(b)}>
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
        searchPlaceholder="Search bonuses…"
        actions={
          can('payroll:create') && (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
              Add Bonus
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
          rowKey={(b) => b.id}
          loading={list.loading}
          emptyTitle="No bonuses"
          emptyDescription="Statutory and discretionary bonuses tagged to a payroll month appear here."
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <BonusFormModal open={formOpen} bonus={editing} onClose={() => setFormOpen(false)} onSaved={() => list.refetch()} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete bonus?"
        message={toDelete ? `This bonus of ${inr(toDelete.amount)} will be removed.` : undefined}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
