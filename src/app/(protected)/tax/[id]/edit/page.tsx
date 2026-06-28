'use client';

import { use, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { TaxDeclarationForm } from '@/components/modules/tax/TaxDeclarationForm';
import { taxApi, type TaxDeclaration } from '@/lib/api/tax';
import { ApiError } from '@/lib/api/client';

export default function EditTaxDeclarationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [declaration, setDeclaration] = useState<TaxDeclaration | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    taxApi
      .get(id)
      .then(setDeclaration)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load declaration'));
  }, [id]);

  return (
    <RequirePermission permission="tax:edit">
      <PageHeader title="Edit tax declaration" description={declaration ? declaration.financialYear : 'Loading…'} />
      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : !declaration ? (
        <div className="py-16 text-sm text-muted">Loading…</div>
      ) : (
        <TaxDeclarationForm declaration={declaration} />
      )}
    </RequirePermission>
  );
}
