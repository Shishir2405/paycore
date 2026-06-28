'use client';

import { useState } from 'react';
import { Plus, DotsThreeVertical, CheckCircle, XCircle, PencilSimple, Trash, Receipt } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { reimbursementsApi, type Reimbursement } from '@/lib/api/benefits';
import { ApiError } from '@/lib/api/client';
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
import { ReimbursementFormModal } from './ReimbursementFormModal';
import { inr, STATUS_TONE } from './format';

export function ReimbursementsTab() {
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const list = useList<Reimbursement>('/reimbursements', {
    initialSortBy: 'createdAt',
    initialSortDir: 'desc',
    filters: { status: status || undefined, type: type || undefined },
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reimbursement | null>(null);

  async function decide(claim: Reimbursement, action: 'approve' | 'reject') {
    try {
      await reimbursementsApi[action](claim.id);
      toast.success(action === 'approve' ? 'Claim approved' : 'Claim rejected');
      list.refetch();
    } catch (err) {
      toast.error('Action failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  async function handleDelete(claim: Reimbursement) {
    if (!confirm('Delete this reimbursement claim?')) return;
    try {
      await reimbursementsApi.remove(claim.id);
      toast.success('Claim deleted');
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  const columns: TableColumn<Reimbursement>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (r) => (
        <div>
          <p className="font-medium text-fg">{r.employee.fullName ?? '—'}</p>
          {r.employee.employeeCode && <p className="text-xs text-muted">{r.employee.employeeCode}</p>}
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (r) => <span className="text-fg-subtle">{r.type}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => inr(r.amount) },
    { key: 'date', header: 'Date', render: (r) => new Date(r.date).toLocaleDateString('en-IN') },
    {
      key: 'status',
      header: 'Status',
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
        const pending = r.status === 'Pending';
        return (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            {can('benefits:approve') && pending && (
              <DropdownItem icon={<CheckCircle size={16} />} onClick={() => decide(r, 'approve')}>
                Approve
              </DropdownItem>
            )}
            {can('benefits:approve') && pending && (
              <DropdownItem icon={<XCircle size={16} />} danger onClick={() => decide(r, 'reject')}>
                Reject
              </DropdownItem>
            )}
            {can('benefits:edit') && pending && (
              <DropdownItem
                icon={<PencilSimple size={16} />}
                onClick={() => {
                  setEditing(r);
                  setFormOpen(true);
                }}
              >
                Edit
              </DropdownItem>
            )}
            {can('benefits:delete') && (
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
        searchPlaceholder="Search claims…"
        filters={
          <>
            <div className="w-36">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { label: 'All statuses', value: '' },
                  { label: 'Pending', value: 'Pending' },
                  { label: 'Approved', value: 'Approved' },
                  { label: 'Rejected', value: 'Rejected' },
                ]}
              />
            </div>
            <div className="w-32">
              <Select
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={[
                  { label: 'All types', value: '' },
                  { label: 'Travel', value: 'Travel' },
                  { label: 'Medical', value: 'Medical' },
                  { label: 'Other', value: 'Other' },
                ]}
              />
            </div>
          </>
        }
        actions={
          can('benefits:create') && (
            <Button
              icon={<Plus size={16} weight="bold" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New claim
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
          rowKey={(r) => r.id}
          loading={list.loading}
          emptyTitle="No reimbursements yet"
          emptyDescription="Raise an expense claim for approval."
          emptyAction={
            can('benefits:create') && (
              <Button
                icon={<Receipt size={16} weight="fill" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                New claim
              </Button>
            )
          }
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <ReimbursementFormModal
        open={formOpen}
        claim={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => list.refetch()}
      />
    </div>
  );
}
