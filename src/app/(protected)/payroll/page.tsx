'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, CaretRight, Stack, Receipt } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { payrollApi, type PayrollRun } from '@/lib/api/payroll';
import { ApiError } from '@/lib/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  Pagination,
  Select,
  Table,
  type TableColumn,
  useToast,
} from '@/components/ui';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_TONE: Record<string, 'neutral' | 'info' | 'warning' | 'success'> = {
  Draft: 'neutral',
  Calculated: 'info',
  Approved: 'warning',
  Locked: 'success',
};

export default function PayrollPage() {
  const router = useRouter();
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const list = useList<PayrollRun>('/payroll-runs', { initialSortBy: 'createdAt', initialSortDir: 'desc' });

  const now = new Date();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(String(now.getMonth() === 0 ? 12 : now.getMonth()));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [running, setRunning] = useState(false);

  async function runPayroll() {
    setRunning(true);
    try {
      const detail = await payrollApi.runs.calculate({ month: Number(month), year: Number(year) });
      const skipped = detail.skipped?.length ?? 0;
      toast.success(
        'Payroll calculated',
        `${detail.run.totals.headcount} employees${skipped ? `, ${skipped} skipped` : ''}.`,
      );
      setOpen(false);
      router.push(`/payroll/${detail.run.id}`);
    } catch (err) {
      toast.error('Payroll run failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setRunning(false);
    }
  }

  const columns: TableColumn<PayrollRun>[] = [
    {
      key: 'period',
      header: 'Period',
      render: (r) => (
        <span className="font-medium text-fg">
          {MONTHS[r.month]} {r.year}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge tone={STATUS_TONE[r.status] ?? 'neutral'} dot>
          {r.status}
        </Badge>
      ),
    },
    { key: 'headcount', header: 'Employees', align: 'right', render: (r) => r.totals.headcount },
    { key: 'gross', header: 'Gross', align: 'right', render: (r) => INR.format(r.totals.gross) },
    {
      key: 'net',
      header: 'Net pay',
      align: 'right',
      render: (r) => <span className="font-medium text-fg">{INR.format(r.totals.net)}</span>,
    },
    {
      key: 'go',
      header: '',
      align: 'right',
      width: 'w-10',
      render: () => <CaretRight size={16} className="text-muted" />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payroll Runs"
        description="Calculate, review, approve and lock monthly payroll."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" icon={<Stack size={15} />} onClick={() => router.push('/payroll/salary-structures')}>
              Salary Structures
            </Button>
            <Button variant="outline" icon={<Receipt size={15} />} onClick={() => router.push('/payroll/adjustments')}>
              Adjustments
            </Button>
            {can('payroll:create') && (
              <Button icon={<Play size={15} weight="fill" />} onClick={() => setOpen(true)}>
                Run Payroll
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-4">
        {list.error ? (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{list.error}</div>
        ) : (
          <Table
            columns={columns}
            rows={list.rows}
            rowKey={(r) => r.id}
            loading={list.loading}
            onRowClick={(r) => router.push(`/payroll/${r.id}`)}
            emptyTitle="No payroll runs yet"
            emptyDescription="Run payroll for a month to generate payslips and statutory figures."
            emptyAction={
              can('payroll:create') && (
                <Button icon={<Play size={15} weight="fill" />} onClick={() => setOpen(true)}>
                  Run Payroll
                </Button>
              )
            }
          />
        )}

        {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Run payroll"
        description="Pick the month to calculate. Existing draft runs are recalculated."
        size="sm"
        footer={
          <>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={running} icon={<Play size={14} weight="fill" />} onClick={runPayroll}>
              Run
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Month">
            <Select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              options={MONTHS.slice(1).map((m, i) => ({ label: m, value: String(i + 1) }))}
            />
          </Field>
          <Field label="Year">
            <Input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
