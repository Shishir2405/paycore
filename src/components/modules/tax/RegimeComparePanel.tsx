'use client';

import { useState } from 'react';
import { Calculator, ArrowRight } from '@phosphor-icons/react';
import { taxApi, type RegimeComparison } from '@/lib/api/tax';
import { ApiError } from '@/lib/api/client';
import { Card, CardHeader, CardBody, Field, Input, Button, Badge, useToast } from '@/components/ui';

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * Standalone Old-vs-New tax regime calculator. Calls POST /tax/regime-compare
 * which runs the FY2024-25 slab engine server-side. Read-only; no persistence.
 */
export function RegimeComparePanel() {
  const toast = useToast();
  const [grossIncome, setGrossIncome] = useState('1200000');
  const [deductions, setDeductions] = useState('150000');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegimeComparison | null>(null);

  async function compute() {
    setLoading(true);
    try {
      const res = await taxApi.compareRegimes({
        grossIncome: Number(grossIncome) || 0,
        deductions: Number(deductions) || 0,
      });
      setResult(res);
    } catch (err) {
      toast.error('Could not compute', err instanceof ApiError ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Regime comparison"
        description="FY 2024-25 — compare Old vs New regime tax."
      />
      <CardBody className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Gross annual income (₹)">
            <Input
              type="number"
              inputMode="numeric"
              value={grossIncome}
              onChange={(e) => setGrossIncome(e.target.value)}
              placeholder="1200000"
            />
          </Field>
          <Field label="Deductions (Old regime, ₹)" hint="80C, 80D, home loan interest…">
            <Input
              type="number"
              inputMode="numeric"
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
              placeholder="150000"
            />
          </Field>
        </div>

        <Button
          icon={<Calculator size={16} weight="bold" />}
          loading={loading}
          onClick={compute}
          className="w-full sm:w-auto"
        >
          Compare regimes
        </Button>

        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <RegimeCard
                title="Old regime"
                breakdown={result.old}
                recommended={result.recommended === 'Old'}
              />
              <RegimeCard
                title="New regime"
                breakdown={result.new}
                recommended={result.recommended === 'New'}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-brand/30 bg-brand-subtle px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-fg">
                Recommended
                <ArrowRight size={14} weight="bold" className="text-muted" />
                <Badge tone="brand">{result.recommended} regime</Badge>
              </span>
              {result.savings > 0 && (
                <span className="text-xs text-muted">
                  Saves <span className="font-medium text-success">{INR.format(result.savings)}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function RegimeCard({
  title,
  breakdown,
  recommended,
}: {
  title: string;
  breakdown: RegimeComparison['old'];
  recommended: boolean;
}) {
  return (
    <div
      className={
        'rounded-md border p-3 ' +
        (recommended ? 'border-success/40 bg-success/5' : 'border-border bg-surface-2/40')
      }
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-fg">{title}</span>
        {recommended && <Badge tone="success">Best</Badge>}
      </div>
      <dl className="space-y-1 text-xs">
        <Row label="Taxable income" value={INR.format(breakdown.taxableIncome)} />
        <Row label="Tax (slabs)" value={INR.format(breakdown.taxBeforeRebate)} />
        <Row label="Rebate 87A" value={`− ${INR.format(breakdown.rebate)}`} />
        <Row label="Cess (4%)" value={INR.format(breakdown.cess)} />
        <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5">
          <dt className="text-sm font-medium text-fg">Total tax</dt>
          <dd className="text-sm font-semibold text-fg">{INR.format(breakdown.totalTax)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono text-fg-subtle">{value}</dd>
    </div>
  );
}
