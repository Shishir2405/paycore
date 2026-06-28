'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { InsuranceForm } from '@/components/modules/benefits/InsuranceForm';

export default function NewInsurancePage() {
  return (
    <RequirePermission permission="benefits:create">
      <PageHeader title="New insurance policy" description="Register a health or life cover for an employee." />
      <InsuranceForm />
    </RequirePermission>
  );
}
