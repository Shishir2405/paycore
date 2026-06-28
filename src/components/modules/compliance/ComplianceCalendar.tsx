'use client';

import { useState } from 'react';
import { Plus, DotsThreeVertical, PencilSimple, Trash, CalendarCheck } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { complianceApi, type ComplianceItem } from '@/lib/api/compliance';
import { ApiError } from '@/lib/api/client';
import { ComplianceItemFormModal } from './ComplianceItemFormModal';
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

const STATUS_TONE: Record<string, 'success' | 'neutral' | 'warning' | 'danger' | 'info'> = {
  Filed: 'success',
  Pending: 'warning',
  Overdue: 'danger',
};

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN') : '—');
const inr = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

export function ComplianceCalendar() {
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const list = useList<ComplianceItem>('/compliance/items', {
    initialSortBy: 'dueDate',
    initialSortDir: 'asc',
    filters: { type: type || undefined, status: status || undefined },
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ComplianceItem | null>(null);

  async function handleDelete(item: ComplianceItem) {
    if (!confirm(`Delete ${item.type} item for ${item.period}?`)) return;
    try {
      await complianceApi.removeItem(item.id);
      toast.success('Item deleted');
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  const columns: TableColumn<ComplianceItem>[] = [
    {
      key: 'type',
      header: 'Type',
      width: 'w-20',
      render: (i) => <span className="font-medium text-fg">{i.type}</span>,
    },
    { key: 'period', header: 'Period', render: (i) => <span className="font-mono text-xs">{i.period}</span> },
    { key: 'dueDate', header: 'Due', sortable: true, render: (i) => fmtDate(i.dueDate) },
    { key: 'amount', header: 'Amount', align: 'right', render: (i) => `₹${inr(i.amount)}` },
    {
      key: 'status',
      header: 'Status',
      render: (i) => (
        <Badge tone={STATUS_TONE[i.status] ?? 'neutral'} dot>
          {i.status}
        </Badge>
      ),
    },
    { key: 'reference', header: 'Reference', render: (i) => i.reference ?? '—' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (i) =>
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
                setEditing(i);
                setFormOpen(true);
              }}
            >
              Edit
            </DropdownItem>
            <DropdownItem icon={<Trash size={16} />} danger onClick={() => handleDelete(i)}>
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
        searchPlaceholder="Search by period or reference…"
        filters={
          <>
            <div className="w-32">
              <Select
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={[
                  { label: 'All types', value: '' },
                  { label: 'PF', value: 'PF' },
                  { label: 'ESI', value: 'ESI' },
                  { label: 'PT', value: 'PT' },
                  { label: 'LWF', value: 'LWF' },
                  { label: 'TDS', value: 'TDS' },
                ]}
              />
            </div>
            <div className="w-36">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { label: 'All statuses', value: '' },
                  { label: 'Pending', value: 'Pending' },
                  { label: 'Filed', value: 'Filed' },
                  { label: 'Overdue', value: 'Overdue' },
                ]}
              />
            </div>
          </>
        }
        actions={
          can('compliance:create') && (
            <Button
              icon={<Plus size={16} weight="bold" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add Item
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
          rowKey={(i) => i.id}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          emptyTitle="No compliance items"
          emptyDescription="Add filings to build your statutory calendar."
          emptyAction={
            can('compliance:create') && (
              <Button
                icon={<CalendarCheck size={16} weight="fill" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add Item
              </Button>
            )
          }
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <ComplianceItemFormModal
        open={formOpen}
        item={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => list.refetch()}
      />
    </div>
  );
}
