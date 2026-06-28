'use client';

import { use, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { DepartmentForm } from '@/components/modules/departments/DepartmentForm';
import { departmentsApi, type Department } from '@/lib/api/departments';
import { ApiError } from '@/lib/api/client';

export default function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [department, setDepartment] = useState<Department | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    departmentsApi
      .get(id)
      .then(setDepartment)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load department'));
  }, [id]);

  return (
    <RequirePermission permission="departments:edit">
      <PageHeader title="Edit department" description={department ? department.code : 'Loading…'} />
      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : !department ? (
        <div className="py-16 text-sm text-muted">Loading…</div>
      ) : (
        <DepartmentForm department={department} />
      )}
    </RequirePermission>
  );
}
