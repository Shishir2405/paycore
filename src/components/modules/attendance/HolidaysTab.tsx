'use client';

import { useState } from 'react';
import { Plus, DotsThreeVertical, PencilSimple, Trash, CalendarStar } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { holidaysApi, type Holiday } from '@/lib/api/holidays';
import { ApiError } from '@/lib/api/client';
import { HolidayFormModal } from './HolidayFormModal';
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

const TYPE_TONE: Record<string, 'success' | 'neutral' | 'warning' | 'info'> = {
  Public: 'info',
  Restricted: 'warning',
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function HolidaysTab() {
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const [type, setType] = useState('');
  const list = useList<Holiday>('/holidays', {
    initialSortBy: 'date',
    initialSortDir: 'asc',
    initialLimit: 50,
    filters: { type: type || undefined },
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);

  async function handleDelete(row: Holiday) {
    if (!confirm(`Delete holiday "${row.name}"?`)) return;
    try {
      await holidaysApi.remove(row.id);
      toast.success('Holiday deleted');
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  const columns: TableColumn<Holiday>[] = [
    { key: 'name', header: 'Name', sortable: true, render: (h) => <span className="font-medium text-fg">{h.name}</span> },
    { key: 'date', header: 'Date', sortable: true, render: (h) => <span className="text-fg-subtle">{fmtDate(h.date)}</span> },
    {
      key: 'type',
      header: 'Type',
      render: (h) => <Badge tone={TYPE_TONE[h.type] ?? 'neutral'}>{h.type}</Badge>,
    },
    { key: 'state', header: 'State', render: (h) => h.state ?? <span className="text-muted">All</span> },
    { key: 'location', header: 'Location', render: (h) => h.location ?? <span className="text-muted">—</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (h) =>
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
                  setEditing(h);
                  setFormOpen(true);
                }}
              >
                Edit
              </DropdownItem>
            )}
            {can('attendance:delete') && (
              <DropdownItem icon={<Trash size={16} />} danger onClick={() => handleDelete(h)}>
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
        searchPlaceholder="Search holidays…"
        filters={
          <div className="w-40">
            <Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { label: 'All types', value: '' },
                { label: 'Public', value: 'Public' },
                { label: 'Restricted', value: 'Restricted' },
              ]}
            />
          </div>
        }
        actions={
          can('attendance:create') && (
            <Button
              icon={<Plus size={16} weight="bold" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add Holiday
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
          rowKey={(h) => h.id}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          emptyTitle="No holidays yet"
          emptyDescription="Build your holiday calendar for the year."
          emptyAction={
            can('attendance:create') && (
              <Button
                icon={<CalendarStar size={16} weight="fill" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add Holiday
              </Button>
            )
          }
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <HolidayFormModal open={formOpen} holiday={editing} onClose={() => setFormOpen(false)} onSaved={() => list.refetch()} />
    </div>
  );
}
