'use client';

import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loanCreateSchema, type LoanCreateInput } from '@/lib/validators/benefits';
import { loansApi } from '@/lib/api/benefits';
import { ApiError } from '@/lib/api/client';
import { Field, Input, Select, Textarea, useToast } from '@/components/ui';
import { FormWizard, type WizardStep } from '@/components/forms/FormWizard';
import { useEmployeeOptions } from '@/hooks/useEmployeeOptions';

/** Page-based, create-only loan wizard. EMI and schedule are computed server-side. */
export function LoanForm() {
  const router = useRouter();
  const toast = useToast();
  const employeeOptions = useEmployeeOptions();

  const methods = useForm<LoanCreateInput>({
    resolver: zodResolver(loanCreateSchema),
    mode: 'onTouched',
    defaultValues: { interestRatePa: 0, tenureMonths: 12 },
  });

  const {
    register,
    formState: { errors, isSubmitting },
  } = methods;

  async function onSubmit(values: LoanCreateInput) {
    try {
      await loansApi.create(values);
      toast.success('Loan created', 'Repayment schedule generated.');
      router.push('/benefits');
      router.refresh();
    } catch (err) {
      toast.error('Could not create loan', err instanceof ApiError ? err.message : undefined);
    }
  }

  const steps: WizardStep[] = [
    {
      id: 'borrower',
      label: 'Borrower & amount',
      description: 'Who is borrowing and how much.',
      fields: ['employeeId', 'principal', 'interestRatePa'],
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Employee" required error={errors.employeeId?.message} className="sm:col-span-2">
            <Select
              {...register('employeeId')}
              invalid={!!errors.employeeId}
              placeholder="Select employee"
              options={employeeOptions}
            />
          </Field>
          <Field label="Principal (₹)" required error={errors.principal?.message} hint="Total amount advanced">
            <Input type="number" step="0.01" min="0" {...register('principal')} invalid={!!errors.principal} placeholder="50000" />
          </Field>
          <Field
            label="Interest rate (% p.a.)"
            error={errors.interestRatePa?.message}
            hint="Reducing-balance, annual. Use 0 for interest-free."
          >
            <Input type="number" step="0.01" min="0" {...register('interestRatePa')} invalid={!!errors.interestRatePa} placeholder="0" />
          </Field>
        </div>
      ),
    },
    {
      id: 'terms',
      label: 'Terms',
      description: 'Repayment tenure and first deduction month.',
      fields: ['tenureMonths', 'startMonth', 'notes'],
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tenure (months)" required error={errors.tenureMonths?.message} hint="Number of EMIs">
            <Input type="number" min="1" step="1" {...register('tenureMonths')} invalid={!!errors.tenureMonths} placeholder="12" />
          </Field>
          <Field label="Start month" required error={errors.startMonth?.message} hint="First deduction month, e.g. 2026-06">
            <Input {...register('startMonth')} invalid={!!errors.startMonth} placeholder="2026-06" className="font-mono" />
          </Field>
          <Field label="Notes" className="sm:col-span-2" error={errors.notes?.message}>
            <Textarea {...register('notes')} invalid={!!errors.notes} rows={2} placeholder="Optional context for this advance" />
          </Field>
        </div>
      ),
    },
  ];

  return (
    <FormProvider {...methods}>
      <FormWizard
        steps={steps}
        onSubmit={methods.handleSubmit(onSubmit)}
        submitting={isSubmitting}
        submitLabel="Create loan"
        onCancel={() => router.back()}
      />
    </FormProvider>
  );
}
