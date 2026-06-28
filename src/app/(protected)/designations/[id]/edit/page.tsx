'use client';

import { use, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { DesignationForm } from '@/components/modules/departments/DesignationForm';
import { designationsApi, type Designation } from '@/lib/api/designations';
import { ApiError } from '@/lib/api/client';

export default function EditDesignationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [designation, setDesignation] = useState<Designation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    designationsApi
      .get(id)
      .then(setDesignation)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load designation'));
  }, [id]);

  return (
    <RequirePermission permission="departments:edit">
      <PageHeader title="Edit designation" description={designation ? designation.code : 'Loading…'} />
      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : !designation ? (
        <div className="py-16 text-sm text-muted">Loading…</div>
      ) : (
        <DesignationForm designation={designation} />
      )}
    </RequirePermission>
  );
}
