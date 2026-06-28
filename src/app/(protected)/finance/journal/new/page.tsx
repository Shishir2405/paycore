'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { JournalEntryForm } from '@/components/modules/finance/JournalEntryForm';

export default function NewJournalPage() {
  return (
    <RequirePermission permission="finance:create">
      <PageHeader title="New journal voucher" description="Record a manual accounting entry. Debits must equal credits." />
      <JournalEntryForm />
    </RequirePermission>
  );
}
