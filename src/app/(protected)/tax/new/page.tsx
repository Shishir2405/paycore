'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { TaxDeclarationForm } from '@/components/modules/tax/TaxDeclarationForm';

export default function NewTaxDeclarationPage() {
  return (
    <RequirePermission permission="tax:create">
      <PageHeader title="New tax declaration" description="Capture an employee investment declaration." />
      <TaxDeclarationForm />
    </RequirePermission>
  );
}
