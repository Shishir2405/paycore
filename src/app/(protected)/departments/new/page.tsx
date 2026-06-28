'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { DepartmentForm } from '@/components/modules/departments/DepartmentForm';

export default function NewDepartmentPage() {
  return (
    <RequirePermission permission="departments:create">
      <PageHeader title="Add department" description="Create a new organisational unit." />
      <DepartmentForm />
    </RequirePermission>
  );
}
