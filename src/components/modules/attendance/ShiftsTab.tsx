'use client';

import { useState } from 'react';
import { Plus, DotsThreeVertical, PencilSimple, Trash, Clock } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { shiftsApi, type Shift } from '@/lib/api/shifts';
import { ApiError } from '@/lib/api/client';
import { ShiftFormModal } from './ShiftFormModal';
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

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ShiftsTab() {
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const list = useList<Shift>('/shifts', { initialSortBy: 'code', initialSortDir: 'asc' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);

  async function handleDelete(row: Shift) {
    if (!confirm(`Delete shift ${row.name} (${row.code})?`)) return;
    try {
      await shiftsApi.remove(row.id);
      toast.success('Shift deleted');
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  const columns: TableColumn<Shift>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      width: 'w-24',
      render: (s) => <span className="font-mono text-xs text-fg-subtle">{s.code}</span>,
    },
    { key: 'name', header: 'Name', sortable: true, render: (s) => <span className="font-medium text-fg">{s.name}</span> },
    {
      key: 'timing',
      header: 'Timing',
      render: (s) => (
        <span className="tabular-nums text-fg-subtle">
          {s.startTime} – {s.endTime}
        </span>
      ),
    },
    { key: 'breakMinutes', header: 'Break', render: (s) => <span className="text-fg-subtle">{s.breakMinutes}m</span> },
    {
      key: 'weeklyOffDays',
      header: 'Weekly offs',
      render: (s) =>
        s.weeklyOffDays.length ? (
          <span className="text-fg-subtle">{s.weeklyOffDays.map((d) => DAY_LABELS[d]).join(', ')}</span>
        ) : (
          <span className="text-muted">None</span>
        ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (s) => <Badge tone={s.isActive ? 'success' : 'neutral'} dot>{s.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (s) =>
        (can('attendance:edit') || can('attendance:delete')) && (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            {can('attendance:edit') && (
              <DropdownItem
                icon={<PencilSimple size={16} />}
                onClick={() => {
                  setEditing(s);
                  setFormOpen(true);
                }}
              >
                Edit
              </DropdownItem>
            )}
            {can('attendance:delete') && (
              <DropdownItem icon={<Trash size={16} />} danger onClick={() => handleDelete(s)}>
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
        searchPlaceholder="Search shifts…"
        actions={
          can('attendance:create') && (
            <Button
              icon={<Plus size={16} weight="bold" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add Shift
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
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          emptyTitle="No shifts yet"
          emptyDescription="Define your working windows to drive overtime calculation."
          emptyAction={
            can('attendance:create') && (
              <Button
                icon={<Clock size={16} weight="fill" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add Shift
              </Button>
            )
          }
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <ShiftFormModal open={formOpen} shift={editing} onClose={() => setFormOpen(false)} onSaved={() => list.refetch()} />
    </div>
  );
}
