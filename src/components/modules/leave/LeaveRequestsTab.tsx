'use client';

import { useState } from 'react';
import { Plus, DotsThreeVertical, Check, X, Trash, CalendarBlank } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { leaveRequestsApi, type LeaveRequest, type LeaveRequestStatus } from '@/lib/api/leave';
import { ApiError } from '@/lib/api/client';
import { LeaveRequestFormModal } from './LeaveRequestFormModal';
import { LeaveDecisionModal } from './LeaveDecisionModal';
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

const STATUS_TONE: Record<LeaveRequestStatus, 'success' | 'neutral' | 'warning' | 'danger'> = {
  Pending: 'warning',
  Approved: 'success',
  Rejected: 'danger',
  Cancelled: 'neutral',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function LeaveRequestsTab() {
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const [status, setStatus] = useState('');
  const list = useList<LeaveRequest>('/leave-requests', {
    initialSortBy: 'fromDate',
    initialSortDir: 'desc',
    filters: { status: status || undefined },
  });

  const [formOpen, setFormOpen] = useState(false);
  const [decision, setDecision] = useState<{ mode: 'approve' | 'reject'; request: LeaveRequest } | null>(null);

  async function handleDelete(r: LeaveRequest) {
    if (!confirm('Delete this leave request? This can be restored by an admin.')) return;
    try {
      await leaveRequestsApi.remove(r.id);
      toast.success('Leave request deleted');
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  const columns: TableColumn<LeaveRequest>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      render: (r) => <span className="font-medium text-fg">{r.employeeName ?? '—'}</span>,
    },
    {
      key: 'leaveTypeName',
      header: 'Type',
      render: (r) => <span className="text-fg-subtle">{r.leaveTypeName ?? '—'}</span>,
    },
    {
      key: 'fromDate',
      header: 'Dates',
      sortable: true,
      render: (r) => (
        <span className="text-xs text-fg-subtle">
          {fmtDate(r.fromDate)} → {fmtDate(r.toDate)}
        </span>
      ),
    },
    {
      key: 'days',
      header: 'Days',
      align: 'right',
      width: 'w-16',
      render: (r) => <span className="font-mono text-xs">{r.days}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-28',
      render: (r) => (
        <Badge tone={STATUS_TONE[r.status] ?? 'neutral'} dot>
          {r.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (r) => {
        const canDecide = can('leave:approve') && r.status === 'Pending';
        const canDelete = can('leave:delete');
        if (!canDecide && !canDelete) return null;
        return (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            {canDecide && (
              <DropdownItem icon={<Check size={16} />} onClick={() => setDecision({ mode: 'approve', request: r })}>
                Approve
              </DropdownItem>
            )}
            {canDecide && (
              <DropdownItem icon={<X size={16} />} onClick={() => setDecision({ mode: 'reject', request: r })}>
                Reject
              </DropdownItem>
            )}
            {canDelete && (
              <DropdownItem icon={<Trash size={16} />} danger onClick={() => handleDelete(r)}>
                Delete
              </DropdownItem>
            )}
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search by reason…"
        filters={
          <div className="w-40">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { label: 'All statuses', value: '' },
                { label: 'Pending', value: 'Pending' },
                { label: 'Approved', value: 'Approved' },
                { label: 'Rejected', value: 'Rejected' },
                { label: 'Cancelled', value: 'Cancelled' },
              ]}
            />
          </div>
        }
        actions={
          can('leave:create') && (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => setFormOpen(true)}>
              New Request
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
          rowKey={(r) => r.id}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          emptyTitle="No leave requests"
          emptyDescription="Leave applications will appear here once submitted."
          emptyAction={
            can('leave:create') && (
              <Button icon={<CalendarBlank size={16} weight="fill" />} onClick={() => setFormOpen(true)}>
                New Request
              </Button>
            )
          }
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <LeaveRequestFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => list.refetch()} />
      <LeaveDecisionModal
        open={Boolean(decision)}
        mode={decision?.mode ?? 'approve'}
        request={decision?.request ?? null}
        onClose={() => setDecision(null)}
        onDone={() => list.refetch()}
      />
    </div>
  );
}
