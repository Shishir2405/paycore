'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, DotsThreeVertical, PencilSimple, Trash, CheckCircle, XCircle } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import {
  loansApi,
  reimbursementsApi,
  insurancePoliciesApi,
  deductionsApi,
  type Loan,
  type Reimbursement,
  type InsurancePolicy,
  type Deduction,
} from '@/lib/api/benefits';
import { ApiError } from '@/lib/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Badge,
  Button,
  Dropdown,
  DropdownItem,
  Table,
  Tabs,
  type TableColumn,
  useToast,
} from '@/components/ui';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const STATUS_TONE: Record<string, 'success' | 'neutral' | 'warning' | 'danger'> = {
  Active: 'success',
  Approved: 'success',
  Closed: 'neutral',
  Pending: 'warning',
  Rejected: 'danger',
};

type TabKey = 'loans' | 'reimbursements' | 'insurance' | 'deductions';

const VALID_TABS: TabKey[] = ['loans', 'reimbursements', 'insurance', 'deductions'];

export default function BenefitsPage() {
  const [tab, setTab] = useState<TabKey>('loans');

  // Support deep-links like /benefits?tab=reimbursements (used after saving).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (t && (VALID_TABS as string[]).includes(t)) setTab(t as TabKey);
  }, []);

  return (
    <div>
      <PageHeader
        title="Benefits & Deductions"
        description="Manage staff loans, reimbursement claims, insurance policies and ad-hoc deductions."
      />

      <div className="space-y-4">
        <Tabs
          items={[
            { key: 'loans', label: 'Loans' },
            { key: 'reimbursements', label: 'Reimbursements' },
            { key: 'insurance', label: 'Insurance' },
            { key: 'deductions', label: 'Deductions' },
          ]}
          value={tab}
          onChange={(k) => setTab(k as TabKey)}
        />

        {tab === 'loans' && <LoansTab />}
        {tab === 'reimbursements' && <ReimbursementsTab />}
        {tab === 'insurance' && <InsuranceTab />}
        {tab === 'deductions' && <DeductionsTab />}
      </div>
    </div>
  );
}

// ─── Shared row-actions menu ──────────────────────────────────────────────────

function RowActions({
  onEdit,
  onDelete,
  extra,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  extra?: React.ReactNode;
}) {
  if (!onEdit && !onDelete && !extra) return null;
  return (
    <Dropdown
      trigger={
        <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
          <DotsThreeVertical size={18} weight="bold" />
        </button>
      }
    >
      {extra}
      {onEdit && (
        <DropdownItem icon={<PencilSimple size={16} />} onClick={onEdit}>
          Edit
        </DropdownItem>
      )}
      {onDelete && (
        <DropdownItem icon={<Trash size={16} />} danger onClick={onDelete}>
          Delete
        </DropdownItem>
      )}
    </Dropdown>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? 'neutral'} dot>
      {status}
    </Badge>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="flex justify-end">
      <Button icon={<Plus size={16} weight="bold" />} onClick={onClick}>
        {label}
      </Button>
    </div>
  );
}

// ─── Loans tab ────────────────────────────────────────────────────────────────

function LoansTab() {
  const router = useRouter();
  const toast = useToast();
  const can = useAuth((s) => s.can);
  const list = useList<Loan>('/loans', { initialSortBy: 'createdAt', initialSortDir: 'desc' });

  const [toDelete, setToDelete] = useState<Loan | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await loansApi.remove(toDelete.id);
      toast.success('Loan deleted');
      setToDelete(null);
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  const columns: TableColumn<Loan>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (l) => (
        <div>
          <p className="font-medium text-fg">{l.employee.fullName ?? '—'}</p>
          {l.employee.employeeCode && <p className="text-xs text-muted">{l.employee.employeeCode}</p>}
        </div>
      ),
    },
    { key: 'principal', header: 'Principal', align: 'right', render: (l) => INR.format(l.principal) },
    { key: 'emi', header: 'EMI', align: 'right', render: (l) => INR.format(l.emi) },
    { key: 'outstanding', header: 'Outstanding', align: 'right', render: (l) => INR.format(l.outstanding) },
    { key: 'startMonth', header: 'Start', width: 'w-24', render: (l) => <span className="font-mono text-xs text-fg-subtle">{l.startMonth}</span> },
    { key: 'status', header: 'Status', width: 'w-24', render: (l) => <StatusBadge status={l.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (l) => (
        <RowActions
          onEdit={can('benefits:edit') ? () => router.push(`/benefits/loans/${l.id}/edit`) : undefined}
          onDelete={can('benefits:delete') ? () => setToDelete(l) : undefined}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {can('benefits:create') && <AddButton label="Add Loan" onClick={() => router.push('/benefits/loans/new')} />}
      {list.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{list.error}</div>
      ) : (
        <Table
          columns={columns}
          rows={list.rows}
          rowKey={(l) => l.id}
          loading={list.loading}
          emptyTitle="No loans yet"
          emptyDescription="Advance a staff loan to generate its repayment schedule."
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete loan?"
        message={toDelete ? `This loan for ${toDelete.employee.fullName ?? 'the employee'} will be removed.` : undefined}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}

// ─── Reimbursements tab ───────────────────────────────────────────────────────

function ReimbursementsTab() {
  const router = useRouter();
  const toast = useToast();
  const can = useAuth((s) => s.can);
  const list = useList<Reimbursement>('/reimbursements', { initialSortBy: 'createdAt', initialSortDir: 'desc' });

  const [toDelete, setToDelete] = useState<Reimbursement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toApprove, setToApprove] = useState<Reimbursement | null>(null);
  const [toReject, setToReject] = useState<Reimbursement | null>(null);
  const [deciding, setDeciding] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await reimbursementsApi.remove(toDelete.id);
      toast.success('Claim deleted');
      setToDelete(null);
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  async function confirmApprove() {
    if (!toApprove) return;
    setDeciding(true);
    try {
      await reimbursementsApi.approve(toApprove.id);
      toast.success('Claim approved');
      setToApprove(null);
      list.refetch();
    } catch (err) {
      toast.error('Approve failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeciding(false);
    }
  }

  async function confirmReject() {
    if (!toReject) return;
    setDeciding(true);
    try {
      await reimbursementsApi.reject(toReject.id);
      toast.success('Claim rejected');
      setToReject(null);
      list.refetch();
    } catch (err) {
      toast.error('Reject failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeciding(false);
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
    { key: 'type', header: 'Type', width: 'w-28', render: (r) => <span className="text-fg-subtle">{r.type}</span> },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => INR.format(r.amount) },
    { key: 'date', header: 'Date', width: 'w-28', render: (r) => <span className="text-fg-subtle">{r.date?.slice(0, 10)}</span> },
    { key: 'status', header: 'Status', width: 'w-24', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (r) => {
        const pending = r.status === 'Pending';
        return (
          <RowActions
            onEdit={can('benefits:edit') ? () => router.push(`/benefits/reimbursements/${r.id}/edit`) : undefined}
            onDelete={can('benefits:delete') ? () => setToDelete(r) : undefined}
            extra={
              pending && can('benefits:approve') ? (
                <>
                  <DropdownItem icon={<CheckCircle size={16} />} onClick={() => setToApprove(r)}>
                    Approve
                  </DropdownItem>
                  <DropdownItem icon={<XCircle size={16} />} danger onClick={() => setToReject(r)}>
                    Reject
                  </DropdownItem>
                </>
              ) : undefined
            }
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {can('benefits:create') && (
        <AddButton label="Add Reimbursement" onClick={() => router.push('/benefits/reimbursements/new')} />
      )}
      {list.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{list.error}</div>
      ) : (
        <Table
          columns={columns}
          rows={list.rows}
          rowKey={(r) => r.id}
          loading={list.loading}
          emptyTitle="No reimbursement claims"
          emptyDescription="Raise an expense claim for approval."
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete claim?"
        message={toDelete ? `This ${toDelete.type} claim of ${INR.format(toDelete.amount)} will be removed.` : undefined}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
      <ConfirmDialog
        open={!!toApprove}
        onClose={() => setToApprove(null)}
        onConfirm={confirmApprove}
        title="Approve claim?"
        message={toApprove ? `Approve ${INR.format(toApprove.amount)} for ${toApprove.employee.fullName ?? 'the employee'}?` : undefined}
        confirmLabel="Approve"
        loading={deciding}
      />
      <ConfirmDialog
        open={!!toReject}
        onClose={() => setToReject(null)}
        onConfirm={confirmReject}
        title="Reject claim?"
        message={toReject ? `Reject ${INR.format(toReject.amount)} for ${toReject.employee.fullName ?? 'the employee'}?` : undefined}
        confirmLabel="Reject"
        danger
        loading={deciding}
      />
    </div>
  );
}

// ─── Insurance tab ────────────────────────────────────────────────────────────

function InsuranceTab() {
  const router = useRouter();
  const toast = useToast();
  const can = useAuth((s) => s.can);
  const list = useList<InsurancePolicy>('/insurance-policies', { initialSortBy: 'createdAt', initialSortDir: 'desc' });

  const [toDelete, setToDelete] = useState<InsurancePolicy | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await insurancePoliciesApi.remove(toDelete.id);
      toast.success('Policy deleted');
      setToDelete(null);
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  const columns: TableColumn<InsurancePolicy>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (p) => (
        <div>
          <p className="font-medium text-fg">{p.employee.fullName ?? '—'}</p>
          {p.employee.employeeCode && <p className="text-xs text-muted">{p.employee.employeeCode}</p>}
        </div>
      ),
    },
    { key: 'policyNo', header: 'Policy no.', render: (p) => <span className="font-mono text-xs text-fg-subtle">{p.policyNo}</span> },
    { key: 'provider', header: 'Provider', render: (p) => <span className="text-fg-subtle">{p.provider}</span> },
    { key: 'sumInsured', header: 'Sum insured', align: 'right', render: (p) => INR.format(p.sumInsured) },
    { key: 'premiumMonthly', header: 'Premium/mo', align: 'right', render: (p) => INR.format(p.premiumMonthly) },
    {
      key: 'isActive',
      header: 'Status',
      width: 'w-24',
      render: (p) => (
        <Badge tone={p.isActive ? 'success' : 'neutral'} dot>
          {p.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (p) => (
        <RowActions
          onEdit={can('benefits:edit') ? () => router.push(`/benefits/insurance/${p.id}/edit`) : undefined}
          onDelete={can('benefits:delete') ? () => setToDelete(p) : undefined}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {can('benefits:create') && <AddButton label="Add Policy" onClick={() => router.push('/benefits/insurance/new')} />}
      {list.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{list.error}</div>
      ) : (
        <Table
          columns={columns}
          rows={list.rows}
          rowKey={(p) => p.id}
          loading={list.loading}
          emptyTitle="No insurance policies"
          emptyDescription="Register a health or life cover for an employee."
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete policy?"
        message={toDelete ? `Policy ${toDelete.policyNo} (${toDelete.provider}) will be removed.` : undefined}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}

// ─── Deductions tab ───────────────────────────────────────────────────────────

function DeductionsTab() {
  const router = useRouter();
  const toast = useToast();
  const can = useAuth((s) => s.can);
  const list = useList<Deduction>('/deductions', { initialSortBy: 'createdAt', initialSortDir: 'desc' });

  const [toDelete, setToDelete] = useState<Deduction | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deductionsApi.remove(toDelete.id);
      toast.success('Deduction deleted');
      setToDelete(null);
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  const columns: TableColumn<Deduction>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (d) => (
        <div>
          <p className="font-medium text-fg">{d.employee.fullName ?? '—'}</p>
          {d.employee.employeeCode && <p className="text-xs text-muted">{d.employee.employeeCode}</p>}
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (d) => (
        <div>
          <p className="font-medium text-fg">{d.name}</p>
          {d.recurring && <p className="text-xs text-muted">Recurring</p>}
        </div>
      ),
    },
    { key: 'amount', header: 'Amount', align: 'right', render: (d) => INR.format(d.amount) },
    { key: 'month', header: 'Month', width: 'w-24', render: (d) => <span className="font-mono text-xs text-fg-subtle">{d.month}</span> },
    {
      key: 'isActive',
      header: 'Status',
      width: 'w-24',
      render: (d) => (
        <Badge tone={d.isActive ? 'success' : 'neutral'} dot>
          {d.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (d) => (
        <RowActions
          onEdit={can('benefits:edit') ? () => router.push(`/benefits/deductions/${d.id}/edit`) : undefined}
          onDelete={can('benefits:delete') ? () => setToDelete(d) : undefined}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {can('benefits:create') && <AddButton label="Add Deduction" onClick={() => router.push('/benefits/deductions/new')} />}
      {list.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{list.error}</div>
      ) : (
        <Table
          columns={columns}
          rows={list.rows}
          rowKey={(d) => d.id}
          loading={list.loading}
          emptyTitle="No deductions"
          emptyDescription="Apply a one-off or recurring deduction to an employee."
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete deduction?"
        message={toDelete ? `${toDelete.name} (${INR.format(toDelete.amount)}) will be removed.` : undefined}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
