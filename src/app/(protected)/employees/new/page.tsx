'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { EmployeeForm } from '@/components/modules/employees/EmployeeForm';

export default function NewEmployeePage() {
  return (
    <RequirePermission permission="employees:create">
      <PageHeader title="Add employee" description="Onboard a new employee in a few quick steps." />
      <EmployeeForm />
    </RequirePermission>
  );
}
