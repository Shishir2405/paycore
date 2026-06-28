'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { PayHeadForm } from '@/components/modules/pay-heads/PayHeadForm';

export default function NewPayHeadPage() {
  return (
    <RequirePermission permission="payheads:create">
      <PageHeader title="Add pay head" description="Configure an earning or deduction component." />
      <PayHeadForm />
    </RequirePermission>
  );
}
