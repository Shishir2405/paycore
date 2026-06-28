'use client';

import { useState } from 'react';
import { Plus, DotsThreeVertical, PencilSimple, Trash } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { leaveTypesApi, type LeaveType } from '@/lib/api/leave';
import { ApiError } from '@/lib/api/client';
import { LeaveTypeFormModal } from './LeaveTypeFormModal';
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

export function LeaveTypesTab() {
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const list = useList<LeaveType>('/leave-types', { initialSortBy: 'name', initialSortDir: 'asc' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);

  async function handleDelete(lt: LeaveType) {
    if (!confirm(`Delete leave type ${lt.name} (${lt.code})?`)) return;
    try {
      await leaveTypesApi.remove(lt.id);
      toast.success('Leave type deleted');
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  const columns: TableColumn<LeaveType>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      width: 'w-24',
      render: (t) => <span className="font-mono text-xs text-fg-subtle">{t.code}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (t) => (
        <div>
          <p className="font-medium text-fg">{t.name}</p>
          {t.description && <p className="text-xs text-muted">{t.description}</p>}
        </div>
      ),
    },
    { key: 'annualQuota', header: 'Quota', align: 'right', render: (t) => `${t.annualQuota} d` },
    {
      key: 'paid',
      header: 'Paid',
      render: (t) => <Badge tone={t.paid ? 'success' : 'neutral'}>{t.paid ? 'Paid' : 'Unpaid'}</Badge>,
    },
    {
      key: 'carryForward',
      header: 'Carry fwd',
      render: (t) => (t.carryForward ? `Up to ${t.maxCarryForward} d` : '—'),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (t) => (
        <Badge tone={t.isActive ? 'success' : 'neutral'} dot>
          {t.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (t) =>
        (can('leave:edit') || can('leave:delete')) && (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            {can('leave:edit') && (
              <DropdownItem
                icon={<PencilSimple size={16} />}
                onClick={() => {
                  setEditing(t);
                  setFormOpen(true);
                }}
              >
                Edit
              </DropdownItem>
            )}
            {can('leave:delete') && (
              <DropdownItem icon={<Trash size={16} />} danger onClick={() => handleDelete(t)}>
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
        searchPlaceholder="Search by name or code…"
        actions={
          can('leave:create') && (
            <Button
              icon={<Plus size={16} weight="bold" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add Leave Type
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
          rowKey={(t) => t.id}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          emptyTitle="No leave types yet"
          emptyDescription="Define your leave policies to start accepting requests."
          emptyAction={
            can('leave:create') && (
              <Button
                icon={<Plus size={16} weight="bold" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add Leave Type
              </Button>
            )
          }
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <LeaveTypeFormModal
        open={formOpen}
        leaveType={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => list.refetch()}
      />
    </div>
  );
}
