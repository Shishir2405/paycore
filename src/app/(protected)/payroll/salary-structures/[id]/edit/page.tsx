'use client';

import { use, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { SalaryStructureForm } from '@/components/modules/payroll/SalaryStructureForm';
import { salaryStructuresApi, type SalaryStructure } from '@/lib/api/payroll';
import { ApiError } from '@/lib/api/client';

export default function EditSalaryStructurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [structure, setStructure] = useState<SalaryStructure | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    salaryStructuresApi
      .get(id)
      .then(setStructure)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load structure'));
  }, [id]);

  return (
    <RequirePermission permission="payroll:edit">
      <PageHeader
        title="Edit salary structure"
        description={structure ? `${structure.employee.fullName ?? ''} · v${structure.version}` : 'Loading…'}
      />
      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : !structure ? (
        <div className="py-16 text-sm text-muted">Loading…</div>
      ) : (
        <SalaryStructureForm structure={structure} />
      )}
    </RequirePermission>
  );
}
