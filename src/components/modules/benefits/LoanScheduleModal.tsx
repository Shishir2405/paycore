'use client';

import { useEffect, useState } from 'react';
import { loansApi, type Loan, type LoanRepayment } from '@/lib/api/benefits';
import { ApiError } from '@/lib/api/client';
import { Modal, Badge, LoadingState, EmptyState } from '@/components/ui';
import { inr } from './format';

type Props = {
  open: boolean;
  loan: Loan | null;
  onClose: () => void;
};

/** Read-only view of a loan's full amortization schedule. */
export function LoanScheduleModal({ open, loan, onClose }: Props) {
  const [rows, setRows] = useState<LoanRepayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !loan) return;
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await loansApi.schedule(loan.id);
        if (active) setRows(data);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.message : 'Failed to load schedule');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, loan]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Repayment schedule"
      description={
        loan
          ? `${loan.employee.fullName ?? 'Employee'} · ${inr(loan.principal)} over ${loan.tenureMonths} months`
          : undefined
      }
      size="xl"
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : rows.length === 0 ? (
        <EmptyState title="No schedule" description="This loan has no repayment rows." />
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-right">EMI</th>
                <th className="px-3 py-2 text-right">Principal</th>
                <th className="px-3 py-2 text-right">Interest</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2 text-center">Paid</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-fg-subtle">{r.monthIndex}</td>
                  <td className="px-3 py-2 text-right">{inr(r.emi)}</td>
                  <td className="px-3 py-2 text-right text-fg-subtle">{inr(r.principalPart)}</td>
                  <td className="px-3 py-2 text-right text-fg-subtle">{inr(r.interestPart)}</td>
                  <td className="px-3 py-2 text-right">{inr(r.balance)}</td>
                  <td className="px-3 py-2 text-center">
                    <Badge tone={r.paid ? 'success' : 'neutral'}>{r.paid ? 'Paid' : 'Due'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
