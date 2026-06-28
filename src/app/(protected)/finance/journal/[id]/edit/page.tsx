'use client';

import { use, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { JournalEntryForm } from '@/components/modules/finance/JournalEntryForm';
import { financeApi, type JournalEntry } from '@/lib/api/finance';
import { ApiError } from '@/lib/api/client';

export default function EditJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    financeApi.journals
      .get(id)
      .then(setEntry)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load voucher'));
  }, [id]);

  return (
    <RequirePermission permission="finance:create">
      <PageHeader title="Edit journal voucher" description={entry ? entry.voucherNo : 'Loading…'} />
      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : !entry ? (
        <div className="py-16 text-sm text-muted">Loading…</div>
      ) : (
        <JournalEntryForm entry={entry} />
      )}
    </RequirePermission>
  );
}
