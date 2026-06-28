'use client';

import { use, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { PayHeadForm } from '@/components/modules/pay-heads/PayHeadForm';
import { payHeadsApi, type PayHead } from '@/lib/api/pay-heads';
import { ApiError } from '@/lib/api/client';

export default function EditPayHeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [payHead, setPayHead] = useState<PayHead | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    payHeadsApi
      .get(id)
      .then(setPayHead)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load pay head'));
  }, [id]);

  return (
    <RequirePermission permission="payheads:edit">
      <PageHeader title="Edit pay head" description={payHead ? payHead.code : 'Loading…'} />
      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : !payHead ? (
        <div className="py-16 text-sm text-muted">Loading…</div>
      ) : (
        <PayHeadForm payHead={payHead} />
      )}
    </RequirePermission>
  );
}
