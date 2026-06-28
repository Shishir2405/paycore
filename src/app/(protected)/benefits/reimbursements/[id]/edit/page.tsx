'use client';

import { use, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { ReimbursementForm } from '@/components/modules/benefits/ReimbursementForm';
import { reimbursementsApi, type Reimbursement } from '@/lib/api/benefits';
import { ApiError } from '@/lib/api/client';

export default function EditReimbursementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [reimbursement, setReimbursement] = useState<Reimbursement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reimbursementsApi
      .get(id)
      .then(setReimbursement)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load claim'));
  }, [id]);

  return (
    <RequirePermission permission="benefits:edit">
      <PageHeader title="Edit reimbursement" description={reimbursement ? reimbursement.type : 'Loading…'} />
      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : !reimbursement ? (
        <div className="py-16 text-sm text-muted">Loading…</div>
      ) : (
        <ReimbursementForm reimbursement={reimbursement} />
      )}
    </RequirePermission>
  );
}
