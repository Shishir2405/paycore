'use client';

import { useState } from 'react';
import { Plus, DotsThreeVertical, PencilSimple, Trash, Stack } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { complianceApi, type PtSlab } from '@/lib/api/compliance';
import { ApiError } from '@/lib/api/client';
import { PtSlabFormModal } from './PtSlabFormModal';
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

const inr = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function PtSlabsTab() {
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const list = useList<PtSlab>('/compliance/pt-slabs', { initialSortBy: 'fromAmount', initialSortDir: 'asc' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PtSlab | null>(null);

  async function handleDelete(slab: PtSlab) {
    if (!confirm(`Delete PT slab for ${slab.stateCode} (₹${inr(slab.fromAmount)}+)?`)) return;
    try {
      await complianceApi.removePtSlab(slab.id);
      toast.success('Slab deleted');
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  const columns: TableColumn<PtSlab>[] = [
    { key: 'stateCode', header: 'State', width: 'w-20', render: (s) => <span className="font-medium text-fg">{s.stateCode}</span> },
    {
      key: 'range',
      header: 'Gross range (₹)',
      render: (s) => `${inr(s.fromAmount)} – ${s.toAmount === null ? '∞' : inr(s.toAmount)}`,
    },
    { key: 'amount', header: 'PT (₹)', align: 'right', render: (s) => inr(s.amount) },
    { key: 'frequency', header: 'Frequency', render: (s) => <span className="text-fg-subtle">{s.frequency}</span> },
    { key: 'month', header: 'Month', render: (s) => (s.month ? MONTHS[s.month] : '—') },
    {
      key: 'isActive',
      header: 'Active',
      render: (s) => <Badge tone={s.isActive ? 'success' : 'neutral'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (s) =>
        can('compliance:edit') && (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            <DropdownItem
              icon={<PencilSimple size={16} />}
              onClick={() => {
                setEditing(s);
                setFormOpen(true);
              }}
            >
              Edit
            </DropdownItem>
            <DropdownItem icon={<Trash size={16} />} danger onClick={() => handleDelete(s)}>
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
        searchPlaceholder="Search by state code…"
        actions={
          can('compliance:create') && (
            <Button
              icon={<Plus size={16} weight="bold" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add Slab
            </Button>
          )
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
          rowKey={(s) => s.id}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          emptyTitle="No PT slabs configured"
          emptyDescription="Add slabs per state. The calculator falls back to the Maharashtra default when none exist."
          emptyAction={
            can('compliance:create') && (
              <Button
                icon={<Stack size={16} weight="fill" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add Slab
              </Button>
            )
          }
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <PtSlabFormModal
        open={formOpen}
        slab={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => list.refetch()}
      />
    </div>
  );
}
