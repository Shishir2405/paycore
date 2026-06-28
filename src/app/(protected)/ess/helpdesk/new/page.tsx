'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { EssNav } from '@/components/modules/ess/EssNav';
import { HelpdeskCreateForm } from '@/components/modules/ess/HelpdeskCreateForm';

export default function NewHelpdeskTicketPage() {
  return (
    <RequirePermission permission="ess:view">
      <PageHeader title="Raise a ticket" description="Tell HR or support what you need help with." />
      <EssNav />
      <HelpdeskCreateForm />
    </RequirePermission>
  );
}
