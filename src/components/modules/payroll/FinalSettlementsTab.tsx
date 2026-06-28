'use client';

import { useState } from 'react';
import { Plus, DotsThreeVertical, PencilSimple, Trash } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { payrollApi, type FinalSettlement } from '@/lib/api/payroll';
import { ApiError } from '@/lib/api/client';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FinalSettlementFormModal } from './FinalSettlementFormModal';
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
import { inr, formatDate } from './format';

const TONES: Record<string, 'neutral' | 'warning' | 'success'> = {
  Draft: 'neutral',
  Approved: 'warning',
  Paid: 'success',
};

export function FinalSettlementsTab() {
  const toast = useToast();
  const can = useAuth((s) => s.can);
  const list = useList<FinalSettlement>('/final-settlements', { initialSortBy: 'createdAt', initialSortDir: 'desc' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinalSettlement | null>(null);
  const [toDelete, setToDelete] = useState<FinalSettlement | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await payrollApi.settlements.remove(toDelete.id);
      toast.success('Settlement deleted');
      setToDelete(null);
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  const columns: TableColumn<FinalSettlement>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (s) => (
        <div>
          <p className="font-medium text-fg">{s.employee.fullName ?? s.employee.id}</p>
          {s.employee.employeeCode && <p className="font-mono text-xs text-muted">{s.employee.employeeCode}</p>}
        </div>
      ),
    },
    { key: 'lastWorkingDay', header: 'Last working day', render: (s) => formatDate(s.lastWorkingDay) },
    { key: 'gratuity', header: 'Gratuity', align: 'right', render: (s) => inr(s.gratuity) },
    { key: 'netSettlement', header: 'Net', align: 'right', render: (s) => <span className="font-semibold">{inr(s.netSettlement)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <Badge tone={TONES[s.status] ?? 'neutral'}>{s.status}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (s) =>
        can('payroll:edit') && (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            <DropdownItem icon={<PencilSimple size={16} />} onClick={() => { setEditing(s); setFormOpen(true); }}>
              Edit
            </DropdownItem>
            <DropdownItem icon={<Trash size={16} />} danger onClick={() => setToDelete(s)}>
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
        searchPlaceholder="Search settlements…"
        actions={
          can('payroll:create') && (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => { setEditing(null); setFormOpen(true); }}>
              New Settlement
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
          rowKey={(s) => s.id}
          loading={list.loading}
          emptyTitle="No final settlements"
          emptyDescription="Full & final settlements for exiting employees appear here."
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <FinalSettlementFormModal
        open={formOpen}
        settlement={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => list.refetch()}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete settlement?"
        message={toDelete ? `The settlement of ${inr(toDelete.netSettlement)} will be removed.` : undefined}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
