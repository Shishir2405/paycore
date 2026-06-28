'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loanCreateSchema, type LoanCreateInput } from '@/lib/validators/benefits';
import { loansApi } from '@/lib/api/benefits';
import { ApiError } from '@/lib/api/client';
import { computeEmi } from '@/lib/benefits/emi';
import { Modal, Field, Input, Select, Button, useToast } from '@/components/ui';
import { useEmployeeOptions } from './useEmployeeOptions';
import { inr } from './format';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const thisMonth = new Date().toISOString().slice(0, 7);

/** Create-only modal. Loan terms are immutable once the schedule is generated. */
export function LoanFormModal({ open, onClose, onSaved }: Props) {
  const toast = useToast();
  const employeeOptions = useEmployeeOptions(open);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoanCreateInput>({
    resolver: zodResolver(loanCreateSchema),
    defaultValues: { startMonth: thisMonth, interestRatePa: 0 },
  });

  const principal = Number(watch('principal')) || 0;
  const rate = Number(watch('interestRatePa')) || 0;
  const tenure = Number(watch('tenureMonths')) || 0;
  const emiPreview = computeEmi(principal, rate, tenure);

  async function onSubmit(values: LoanCreateInput) {
    try {
      await loansApi.create(values);
      toast.success('Loan created', 'Repayment schedule generated');
      reset({ startMonth: thisMonth, interestRatePa: 0 });
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not create loan', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New loan"
      description="EMI and the full reducing-balance schedule are computed on save"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="loan-form" loading={isSubmitting}>
            Create loan
          </Button>
        </>
      }
    >
      <form id="loan-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Employee" required error={errors.employeeId?.message} className="sm:col-span-2">
          <Select
            {...register('employeeId')}
            invalid={!!errors.employeeId}
            placeholder="Select employee"
            options={employeeOptions}
          />
        </Field>
        <Field label="Principal (₹)" required error={errors.principal?.message}>
          <Input type="number" step="0.01" min="0" {...register('principal')} invalid={!!errors.principal} placeholder="100000" />
        </Field>
        <Field label="Interest rate (% p.a.)" error={errors.interestRatePa?.message} hint="Reducing balance">
          <Input type="number" step="0.01" min="0" {...register('interestRatePa')} invalid={!!errors.interestRatePa} placeholder="0" />
        </Field>
        <Field label="Tenure (months)" required error={errors.tenureMonths?.message}>
          <Input type="number" step="1" min="1" {...register('tenureMonths')} invalid={!!errors.tenureMonths} placeholder="12" />
        </Field>
        <Field label="Start month" required error={errors.startMonth?.message} hint="First deduction cycle">
          <Input type="month" {...register('startMonth')} invalid={!!errors.startMonth} />
        </Field>
        <Field label="Notes" error={errors.notes?.message} className="sm:col-span-2">
          <Input {...register('notes')} placeholder="Optional" />
        </Field>

        <div className="sm:col-span-2 flex items-center justify-between rounded-md border border-border bg-surface-2/50 px-4 py-3">
          <span className="text-xs uppercase tracking-wide text-muted">Estimated monthly EMI</span>
          <span className="text-base font-semibold text-fg">{emiPreview > 0 ? inr(emiPreview) : '—'}</span>
        </div>
      </form>
    </Modal>
  );
}
