'use client';

import { useState } from 'react';
import { Calculator } from '@phosphor-icons/react';
import { complianceApi, type CalculateResult } from '@/lib/api/compliance';
import { ApiError } from '@/lib/api/client';
import { Card, CardHeader, CardBody, Field, Input, Button, Badge, useToast } from '@/components/ui';

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Interactive PF/ESI/PT/LWF calculator backed by /compliance/calculate. */
export function StatutoryCalculator() {
  const toast = useToast();
  const [basic, setBasic] = useState('15000');
  const [gross, setGross] = useState('25000');
  const [stateCode, setStateCode] = useState('MH');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculateResult | null>(null);

  async function run() {
    setLoading(true);
    try {
      const res = await complianceApi.calculate({
        basic: Number(basic) || 0,
        gross: Number(gross) || 0,
        stateCode: stateCode.toUpperCase(),
        month: Number(month) || undefined,
      });
      setResult(res);
    } catch (err) {
      toast.error('Calculation failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <CardHeader title="Inputs" description="Enter wage components and state" />
        <CardBody className="space-y-4">
          <Field label="Basic + DA (₹)" hint="PF wage">
            <Input type="number" value={basic} onChange={(e) => setBasic(e.target.value)} />
          </Field>
          <Field label="Monthly gross (₹)" hint="ESI applicability + PT slab">
            <Input type="number" value={gross} onChange={(e) => setGross(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="State code">
              <Input value={stateCode} onChange={(e) => setStateCode(e.target.value)} className="uppercase" />
            </Field>
            <Field label="Month">
              <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(e.target.value)} />
            </Field>
          </div>
          <Button fullWidth icon={<Calculator size={16} weight="fill" />} onClick={run} loading={loading}>
            Calculate
          </Button>
        </CardBody>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader
          title="Result"
          description={
            result ? `${MONTHS[(result.input.month ?? 1) - 1] ?? ''} · ${result.pt.stateCode}` : 'Run a calculation'
          }
        />
        <CardBody>
          {!result ? (
            <p className="py-8 text-center text-sm text-muted">
              Enter values and press Calculate to see PF, ESI, PT and LWF.
            </p>
          ) : (
            <div className="space-y-4">
              <Row
                label="Provident Fund (PF)"
                badge={<Badge tone="info">12%</Badge>}
                employee={result.pf.employee}
                employer={result.pf.employer}
                detail={`EPS ${inr(result.pf.employerEps)} · EPF ${inr(result.pf.employerEpf)}`}
              />
              <Row
                label="ESI"
                badge={
                  result.esi.applicable ? (
                    <Badge tone="info">0.75% / 3.25%</Badge>
                  ) : (
                    <Badge tone="neutral">Not applicable</Badge>
                  )
                }
                employee={result.esi.employee}
                employer={result.esi.employer}
              />
              <Row
                label="Professional Tax (PT)"
                badge={
                  result.pt.usedDefault ? <Badge tone="warning">Default MH</Badge> : <Badge tone="neutral">{result.pt.stateCode}</Badge>
                }
                employee={result.pt.amount}
                employer={0}
              />
              <Row
                label="Labour Welfare Fund (LWF)"
                badge={
                  result.lwf.applicable ? (
                    <Badge tone="info">{result.lwf.frequency}</Badge>
                  ) : (
                    <Badge tone="neutral">Not this month</Badge>
                  )
                }
                employee={result.lwf.employee}
                employer={result.lwf.employer}
              />

              <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="font-semibold text-fg">Totals</span>
                <div className="flex gap-6">
                  <span className="text-muted">
                    Employee <span className="ml-1 font-semibold text-fg">{inr(result.totals.employee)}</span>
                  </span>
                  <span className="text-muted">
                    Employer <span className="ml-1 font-semibold text-fg">{inr(result.totals.employer)}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Row({
  label,
  badge,
  employee,
  employer,
  detail,
}: {
  label: string;
  badge?: React.ReactNode;
  employee: number;
  employer: number;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-fg">{label}</span>
          {badge}
        </div>
        {detail && <p className="mt-0.5 text-xs text-muted">{detail}</p>}
      </div>
      <div className="flex shrink-0 gap-6 text-right text-sm">
        <span className="text-fg-subtle">{inr(employee)}</span>
        <span className="w-20 text-fg-subtle">{inr(employer)}</span>
      </div>
    </div>
  );
}
