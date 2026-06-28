'use client';

import { useState } from 'react';
import { Plus, DotsThreeVertical, PencilSimple, Trash, Stack } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { financeApi, type CostCenter } from '@/lib/api/finance';
import { ApiError } from '@/lib/api/client';
import { CostCenterFormModal } from './CostCenterFormModal';
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

export function CostCentersTab() {
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const list = useList<CostCenter>('/cost-centers', { initialSortBy: 'code', initialSortDir: 'asc' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CostCenter | null>(null);

  async function handleDelete(cc: CostCenter) {
    if (!confirm(`Delete cost center ${cc.name} (${cc.code})?`)) return;
    try {
      await financeApi.costCenters.remove(cc.id);
      toast.success('Cost center deleted');
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  const columns: TableColumn<CostCenter>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      width: 'w-32',
      render: (c) => <span className="font-mono text-xs text-fg-subtle">{c.code}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (c) => (
        <div>
          <p className="font-medium text-fg">{c.name}</p>
          {c.description && <p className="text-xs text-muted">{c.description}</p>}
        </div>
      ),
    },
    { key: 'parentName', header: 'Parent', render: (c) => c.parentName ?? '—' },
    {
      key: 'isActive',
      header: 'Status',
      render: (c) => (
        <Badge tone={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (c) =>
        can('finance:create') && (
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
                setEditing(c);
                setFormOpen(true);
              }}
            >
              Edit
            </DropdownItem>
            <DropdownItem icon={<Trash size={16} />} danger onClick={() => handleDelete(c)}>
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
        searchPlaceholder="Search by name or code…"
        actions={
          can('finance:create') && (
            <Button
              icon={<Plus size={16} weight="bold" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add Cost Center
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
          rowKey={(c) => c.id}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          emptyTitle="No cost centers yet"
          emptyDescription="Cost centers let you attribute payroll spend to a unit of the business."
          emptyAction={
            can('finance:create') && (
              <Button
                icon={<Stack size={16} weight="fill" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add Cost Center
              </Button>
            )
          }
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <CostCenterFormModal
        open={formOpen}
        costCenter={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => list.refetch()}
      />
    </div>
  );
}
