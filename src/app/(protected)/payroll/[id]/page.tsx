'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, SealCheck, Lock } from '@phosphor-icons/react';
import { useAuth } from '@/store/auth';
import { payrollApi, type PayrollRunDetail } from '@/lib/api/payroll';
import { ApiError } from '@/lib/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge, Button, Table, type TableColumn, useToast } from '@/components/ui';
import type { PayrollEntry } from '@/lib/api/payroll';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_TONE: Record<string, 'neutral' | 'info' | 'warning' | 'success'> = {
  Draft: 'neutral',
  Calculated: 'info',
  Approved: 'warning',
  Locked: 'success',
};

export default function PayrollRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const [detail, setDetail] = useState<PayrollRunDetail | null>(null);
  const [prevNet, setPrevNet] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'approve' | 'lock' | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    payrollApi.runs
      .get(id)
      .then((d) => {
        setDetail(d);
        // "vs previous month" hint: find the most recent run for a period strictly
        // before this one and remember its net total for a delta comparison.
        payrollApi.runs
          .list({ limit: 100 })
          .then((res) => {
            const cur = d.run.year * 12 + d.run.month;
            const prior = res.data
              .filter((r) => r.id !== d.run.id && r.year * 12 + r.month < cur)
              .sort((a, b) => b.year * 12 + b.month - (a.year * 12 + a.month))[0];
            setPrevNet(prior ? prior.totals.net : null);
          })
          .catch(() => setPrevNet(null));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load run'));
  }, [id]);

  useEffect(() => load(), [load]);

  async function runAction() {
    if (!action) return;
    setBusy(true);
    try {
      if (action === 'approve') await payrollApi.runs.approve(id);
      else await payrollApi.runs.lock(id);
      toast.success(action === 'approve' ? 'Run approved' : 'Run locked');
      setAction(null);
      load();
    } catch (err) {
      toast.error('Action failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  const columns: TableColumn<PayrollEntry>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (e) => (
        <div>
          <p className="font-medium text-fg">{e.employeeName}</p>
          <p className="font-mono text-xs text-muted">{e.employeeCode}</p>
        </div>
      ),
    },
    { key: 'gross', header: 'Gross', align: 'right', render: (e) => INR.format(e.gross) },
    { key: 'pf', header: 'PF', align: 'right', render: (e) => INR.format(e.pf) },
    { key: 'esi', header: 'ESI', align: 'right', render: (e) => INR.format(e.esi) },
    { key: 'pt', header: 'PT', align: 'right', render: (e) => INR.format(e.pt) },
    { key: 'tds', header: 'TDS', align: 'right', render: (e) => INR.format(e.tds) },
    {
      key: 'net',
      header: 'Net pay',
      align: 'right',
      render: (e) => <span className="font-medium text-fg">{INR.format(e.net)}</span>,
    },
  ];

  if (error) {
    return (
      <div>
        <BackLink onClick={() => router.push('/payroll')} />
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      </div>
    );
  }
  if (!detail) return <div className="py-16 text-sm text-muted">Loading run…</div>;

  const { run, entries, skipped } = detail;
  // Net-pay movement vs the previous month's run, if one exists.
  const netDelta = prevNet === null ? null : run.totals.net - prevNet;
  const cards: { label: string; value: string; hint?: React.ReactNode }[] = [
    { label: 'Employees', value: String(run.totals.headcount) },
    { label: 'Gross', value: INR.format(run.totals.gross) },
    { label: 'Deductions', value: INR.format(run.totals.deductions) },
    {
      label: 'Net pay',
      value: INR.format(run.totals.net),
      hint:
        netDelta === null ? null : (
          <span
            className={
              netDelta > 0
                ? 'text-success'
                : netDelta < 0
                  ? 'text-danger'
                  : 'text-muted'
            }
          >
            {netDelta > 0 ? '▲' : netDelta < 0 ? '▼' : '–'} {INR.format(Math.abs(netDelta))} vs prev month
          </span>
        ),
    },
  ];

  return (
    <div>
      <BackLink onClick={() => router.push('/payroll')} />
      <PageHeader
        title={`Payroll · ${MONTHS[run.month]} ${run.year}`}
        description="Per-employee earnings, statutory deductions and net pay."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[run.status] ?? 'neutral'} dot>
              {run.status}
            </Badge>
            {run.status === 'Calculated' && can('payroll:approve') && (
              <Button variant="outline" icon={<SealCheck size={15} />} onClick={() => setAction('approve')}>
                Approve
              </Button>
            )}
            {run.status === 'Approved' && can('payroll:approve') && (
              <Button icon={<Lock size={15} weight="fill" />} onClick={() => setAction('lock')}>
                Lock
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-surface p-3">
            <p className="text-xs text-muted">{c.label}</p>
            <p className="mt-0.5 text-base font-semibold text-fg">{c.value}</p>
            {c.hint && <p className="mt-0.5 text-[11px]">{c.hint}</p>}
          </div>
        ))}
      </div>

      {skipped && skipped.length > 0 && (
        <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
          {skipped.length} employee(s) skipped (no active salary structure): {skipped.map((s) => s.employeeCode).join(', ')}
        </div>
      )}

      <Table columns={columns} rows={entries} rowKey={(e) => e.id} emptyTitle="No entries in this run" />

      <ConfirmDialog
        open={!!action}
        onClose={() => setAction(null)}
        onConfirm={runAction}
        title={action === 'lock' ? 'Lock this payroll run?' : 'Approve this payroll run?'}
        message={
          action === 'lock'
            ? 'Locking finalizes the run — entries can no longer be recalculated. Reopening requires an audited override.'
            : 'Approving marks the run reviewed (maker-checker). You can still lock it afterwards.'
        }
        confirmLabel={action === 'lock' ? 'Lock run' : 'Approve'}
        loading={busy}
      />
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
      <ArrowLeft size={14} /> Back to runs
    </button>
  );
}
