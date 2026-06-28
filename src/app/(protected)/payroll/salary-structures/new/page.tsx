'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { SalaryStructureForm } from '@/components/modules/payroll/SalaryStructureForm';

export default function NewSalaryStructurePage() {
  return (
    <RequirePermission permission="payroll:create">
      <PageHeader title="Add salary structure" description="Define an employee's compensation components." />
      <SalaryStructureForm />
    </RequirePermission>
  );
}
