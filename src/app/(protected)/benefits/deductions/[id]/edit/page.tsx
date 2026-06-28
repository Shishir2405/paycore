'use client';

import { use, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { DeductionForm } from '@/components/modules/benefits/DeductionForm';
import { deductionsApi, type Deduction } from '@/lib/api/benefits';
import { ApiError } from '@/lib/api/client';

export default function EditDeductionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [deduction, setDeduction] = useState<Deduction | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    deductionsApi
      .get(id)
      .then(setDeduction)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load deduction'));
  }, [id]);

  return (
    <RequirePermission permission="benefits:edit">
      <PageHeader title="Edit deduction" description={deduction ? deduction.name : 'Loading…'} />
      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : !deduction ? (
        <div className="py-16 text-sm text-muted">Loading…</div>
      ) : (
        <DeductionForm deduction={deduction} />
      )}
    </RequirePermission>
  );
}
