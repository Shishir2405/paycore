'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { DeductionForm } from '@/components/modules/benefits/DeductionForm';

export default function NewDeductionPage() {
  return (
    <RequirePermission permission="benefits:create">
      <PageHeader title="New deduction" description="Apply a one-off or recurring deduction to an employee." />
      <DeductionForm />
    </RequirePermission>
  );
}
