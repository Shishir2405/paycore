'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { ReimbursementForm } from '@/components/modules/benefits/ReimbursementForm';

export default function NewReimbursementPage() {
  return (
    <RequirePermission permission="benefits:create">
      <PageHeader title="New reimbursement" description="Raise an expense claim for approval." />
      <ReimbursementForm />
    </RequirePermission>
  );
}
