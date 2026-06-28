'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { LoanForm } from '@/components/modules/benefits/LoanForm';

export default function NewLoanPage() {
  return (
    <RequirePermission permission="benefits:create">
      <PageHeader title="New loan" description="Advance a staff loan and auto-generate its repayment schedule." />
      <LoanForm />
    </RequirePermission>
  );
}
