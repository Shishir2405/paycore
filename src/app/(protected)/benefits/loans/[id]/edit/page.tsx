'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loanUpdateSchema, LOAN_STATUSES, type LoanUpdateInput } from '@/lib/validators/benefits';
import { loansApi, type Loan } from '@/lib/api/benefits';
import { ApiError } from '@/lib/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { Button, Field, Select, Textarea, useToast } from '@/components/ui';

export default function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loansApi
      .get(id)
      .then(setLoan)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load loan'));
  }, [id]);

  return (
    <RequirePermission permission="benefits:edit">
      <PageHeader title="Edit loan" description={loan ? `Outstanding ₹${loan.outstanding.toLocaleString('en-IN')}` : 'Loading…'} />
      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : !loan ? (
        <div className="py-16 text-sm text-muted">Loading…</div>
      ) : (
        <LoanEditForm loan={loan} />
      )}
    </RequirePermission>
  );
}

/** Only status and notes are editable post-creation; principal/EMI are immutable. */
function LoanEditForm({ loan }: { loan: Loan }) {
  const router = useRouter();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoanUpdateInput>({
    resolver: zodResolver(loanUpdateSchema),
    mode: 'onTouched',
    defaultValues: { status: loan.status as LoanUpdateInput['status'], notes: loan.notes ?? '' },
  });

  async function onSubmit(values: LoanUpdateInput) {
    try {
      await loansApi.update(loan.id, values);
      toast.success('Loan updated');
      router.push('/benefits');
      router.refresh();
    } catch (err) {
      toast.error('Could not save loan', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4">
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="grid grid-cols-1 gap-4">
          <Field label="Status" required error={errors.status?.message}>
            <Select
              {...register('status')}
              invalid={!!errors.status}
              options={LOAN_STATUSES.map((s) => ({ label: s, value: s }))}
            />
          </Field>
          <Field label="Notes" error={errors.notes?.message}>
            <Textarea {...register('notes')} invalid={!!errors.notes} rows={3} placeholder="Optional context for this loan" />
          </Field>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" type="button" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
