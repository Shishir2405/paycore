'use client';

import { use, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { EmployeeForm } from '@/components/modules/employees/EmployeeForm';
import { employeesApi, type Employee } from '@/lib/api/employees';
import { ApiError } from '@/lib/api/client';

export default function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    employeesApi
      .get(id)
      .then(setEmployee)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load employee'));
  }, [id]);

  return (
    <RequirePermission permission="employees:edit">
      <PageHeader title="Edit employee" description={employee ? employee.employeeCode : 'Loading…'} />
      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : !employee ? (
        <div className="py-16 text-sm text-muted">Loading…</div>
      ) : (
        <EmployeeForm employee={employee} />
      )}
    </RequirePermission>
  );
}
