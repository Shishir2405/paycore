'use client';

import { useEffect, useState } from 'react';
import { DownloadSimple, FileText } from '@phosphor-icons/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { useAuth } from '@/store/auth';
import { payrollApi, type PayrollRun } from '@/lib/api/payroll';
import { payslipsApi, type PayslipRow } from '@/lib/api/payslips';
import { ApiError } from '@/lib/api/client';
import { ReportExportMenu } from '@/components/modules/payslips/ReportExportMenu';
import {
  Button,
  Card,
  CardBody,
  Field,
  Select,
  Table,
  type TableColumn,
  type SelectOption,
  useToast,
} from '@/components/ui';

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Compact INR amount formatter for table cells. */
function inr(n: number): string {
  return (n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PayslipsPage() {
  return (
    <RequirePermission permission="payslips:view">
      <PayslipsView />
    </RequirePermission>
  );
}

function PayslipsView() {
  const toast = useToast();
  const canExport = useAuth((s) => s.can)('payslips:export');

  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [runId, setRunId] = useState('');
  const [rows, setRows] = useState<PayslipRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Load available runs once.
  useEffect(() => {
    payrollApi.runs
      .list({ limit: 100, sortBy: 'createdAt', sortDir: 'desc' })
      .then((res) => {
        setRuns(res.data);
        if (res.data[0]) setRunId(res.data[0].id);
      })
      .catch(() => setRuns([]));
  }, []);

  // Load payslip rows when the selected run changes.
  useEffect(() => {
    if (!runId) {
      setRows([]);
      return;
    }
    setLoading(true);
    payslipsApi
      .listByRun(runId)
      .then(setRows)
      .catch((err: unknown) => toast.error('Failed to load payslips', err instanceof ApiError ? err.message : undefined))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const runOptions: SelectOption[] = runs.map((r) => ({
    label: `${MONTHS[r.month]} ${r.year} · ${r.status}`,
    value: r.id,
  }));

  const columns: TableColumn<PayslipRow>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (p) => (
        <div>
          <p className="font-medium text-fg">{p.employeeName}</p>
          <p className="font-mono text-xs text-muted">{p.employeeCode}</p>
        </div>
      ),
    },
    { key: 'gross', header: 'Gross', align: 'right', render: (p) => <span className="tabular-nums">{inr(p.gross)}</span> },
    {
      key: 'totalDeductions',
      header: 'Deductions',
      align: 'right',
      render: (p) => <span className="tabular-nums text-muted">{inr(p.totalDeductions)}</span>,
    },
    {
      key: 'net',
      header: 'Net Pay',
      align: 'right',
      render: (p) => <span className="font-semibold tabular-nums text-fg">{inr(p.net)}</span>,
    },
    {
      key: 'download',
      header: '',
      align: 'right',
      width: 'w-36',
      render: (p) => (
        <Button
          variant="outline"
          size="sm"
          icon={<DownloadSimple size={14} />}
          onClick={() => window.open(payslipsApi.payslipPdfUrl(p.id), '_blank')}
        >
          Payslip
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payslips & Reports"
        description="Download individual payslips and statutory/finance reports for a payroll run."
      />

      <div className="space-y-4">
        <Card>
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:w-72">
              <Field label="Payroll run">
                <Select
                  value={runId}
                  onChange={(e) => setRunId(e.target.value)}
                  placeholder={runs.length ? 'Select a run' : 'No runs available'}
                  options={runOptions}
                />
              </Field>
            </div>

            {runId && canExport && (
              <div className="flex flex-wrap items-center gap-2">
                <ReportExportMenu label="Salary Register" kind="salary-register" runId={runId} />
                <ReportExportMenu label="EPF ECR" kind="epf-ecr" runId={runId} />
                <ReportExportMenu label="ESIC" kind="esic" runId={runId} />
                <ReportExportMenu label="Bank File" kind="bank-transfer" runId={runId} />
              </div>
            )}
          </CardBody>
        </Card>

        {!runId ? (
          <Card>
            <CardBody className="flex flex-col items-center gap-2 py-12 text-center text-muted">
              <FileText size={28} />
              <p className="text-sm">Select a payroll run to view its payslips and exports.</p>
            </CardBody>
          </Card>
        ) : (
          <Table
            columns={columns}
            rows={rows}
            rowKey={(p) => p.id}
            loading={loading}
            emptyTitle="No payslips in this run"
            emptyDescription="This run has no computed employee entries."
          />
        )}
      </div>
    </div>
  );
}
