'use client';

import { use, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { InsuranceForm } from '@/components/modules/benefits/InsuranceForm';
import { insurancePoliciesApi, type InsurancePolicy } from '@/lib/api/benefits';
import { ApiError } from '@/lib/api/client';

export default function EditInsurancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [policy, setPolicy] = useState<InsurancePolicy | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    insurancePoliciesApi
      .get(id)
      .then(setPolicy)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load policy'));
  }, [id]);

  return (
    <RequirePermission permission="benefits:edit">
      <PageHeader title="Edit insurance policy" description={policy ? policy.policyNo : 'Loading…'} />
      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : !policy ? (
        <div className="py-16 text-sm text-muted">Loading…</div>
      ) : (
        <InsuranceForm policy={policy} />
      )}
    </RequirePermission>
  );
}
