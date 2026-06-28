'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, DotsThreeVertical, PencilSimple, Trash, SealCheck, Receipt } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { taxApi, type TaxDeclaration } from '@/lib/api/tax';
import { ApiError } from '@/lib/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RegimeComparePanel } from '@/components/modules/tax/RegimeComparePanel';
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

const STATUS_TONE: Record<string, 'success' | 'neutral' | 'warning' | 'info'> = {
  Draft: 'neutral',
  Submitted: 'warning',
  Verified: 'success',
};

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function TaxPage() {
  return (
    <Suspense fallback={null}>
      <TaxView />
    </Suspense>
  );
}

function TaxView() {
  const router = useRouter();
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const [status, setStatus] = useState('');
  const [fy, setFy] = useState('');

  const list = useList<TaxDeclaration>('/tax/declarations', {
    initialSortBy: 'createdAt',
    initialSortDir: 'desc',
    filters: { status: status || undefined, financialYear: fy || undefined },
  });

  const [toVerify, setToVerify] = useState<TaxDeclaration | null>(null);
  const [toDelete, setToDelete] = useState<TaxDeclaration | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmVerify() {
    if (!toVerify) return;
    setBusy(true);
    try {
      await taxApi.verify(toVerify.id, { markSectionsVerified: true });
      toast.success('Declaration verified', `${toVerify.financialYear} locked.`);
      setToVerify(null);
      list.refetch();
    } catch (err) {
      toast.error('Verify failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    try {
      await taxApi.remove(toDelete.id);
      toast.success('Declaration deleted', `${toDelete.financialYear} removed.`);
      setToDelete(null);
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  const columns: TableColumn<TaxDeclaration>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      render: (d) => (
        <div>
          <p className="font-medium text-fg">{d.employeeName ?? '—'}</p>
          {d.employeeCode && <p className="font-mono text-xs text-muted">{d.employeeCode}</p>}
        </div>
      ),
    },
    {
      key: 'financialYear',
      header: 'FY',
      width: 'w-24',
      render: (d) => <span className="font-mono text-xs text-fg-subtle">{d.financialYear}</span>,
    },
    { key: 'regime', header: 'Regime', render: (d) => <span className="text-fg-subtle">{d.regime}</span> },
    {
      key: 'totalDeclared',
      header: 'Declared',
      align: 'right',
      render: (d) => <span className="font-mono text-xs">{INR.format(d.totalDeclared)}</span>,
    },
    {
      key: 'totalProof',
      header: 'Proof',
      align: 'right',
      render: (d) => <span className="font-mono text-xs text-muted">{INR.format(d.totalProof)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <Badge tone={STATUS_TONE[d.status] ?? 'neutral'} dot>
          {d.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (d) => {
        const canEdit = can('tax:edit') && d.status !== 'Verified';
        const canVerify = can('tax:approve') && d.status === 'Submitted';
        const canDelete = can('tax:edit');
        if (!canEdit && !canVerify && !canDelete) return null;
        return (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            {canEdit && (
              <DropdownItem icon={<PencilSimple size={16} />} onClick={() => router.push(`/tax/${d.id}/edit`)}>
                Edit
              </DropdownItem>
            )}
            {canVerify && (
              <DropdownItem icon={<SealCheck size={16} />} onClick={() => setToVerify(d)}>
                Verify
              </DropdownItem>
            )}
            {canDelete && (
              <DropdownItem icon={<Trash size={16} />} danger onClick={() => setToDelete(d)}>
                Delete
              </DropdownItem>
            )}
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tax Management"
        description="Employee TDS declarations and Old vs New regime comparison."
        actions={
          can('tax:create') && (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => router.push('/tax/new')}>
              New Declaration
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <FilterBar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search by financial year…"
            filters={
              <div className="flex items-center gap-2">
                <div className="w-36">
                  <Select
                    value={fy}
                    onChange={(e) => setFy(e.target.value)}
                    options={[
                      { label: 'All years', value: '' },
                      { label: 'FY 2024-25', value: '2024-25' },
                      { label: 'FY 2023-24', value: '2023-24' },
                      { label: 'FY 2025-26', value: '2025-26' },
                    ]}
                  />
                </div>
                <div className="w-36">
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    options={[
                      { label: 'All statuses', value: '' },
                      { label: 'Draft', value: 'Draft' },
                      { label: 'Submitted', value: 'Submitted' },
                      { label: 'Verified', value: 'Verified' },
                    ]}
                  />
                </div>
              </div>
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
              rowKey={(d) => d.id}
              loading={list.loading}
              sortBy={list.sortBy}
              sortDir={list.sortDir}
              onSort={list.toggleSort}
              emptyTitle="No declarations yet"
              emptyDescription="Create a tax declaration to start capturing TDS exemptions."
              emptyAction={
                can('tax:create') && (
                  <Button icon={<Receipt size={16} weight="fill" />} onClick={() => router.push('/tax/new')}>
                    New Declaration
                  </Button>
                )
              }
            />
          )}

          {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}
        </div>

        <div className="lg:col-span-1">
          <RegimeComparePanel />
        </div>
      </div>

      <ConfirmDialog
        open={!!toVerify}
        onClose={() => setToVerify(null)}
        onConfirm={confirmVerify}
        title="Verify declaration?"
        message={toVerify ? `${toVerify.financialYear} will be locked from further edits.` : undefined}
        confirmLabel="Verify"
        loading={busy}
      />
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete declaration?"
        message={toDelete ? `${toDelete.financialYear} will be removed. An admin can restore it later.` : undefined}
        confirmLabel="Delete"
        danger
        loading={busy}
      />
    </div>
  );
}
