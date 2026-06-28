'use client';

import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  reimbursementCreateSchema,
  REIMBURSEMENT_TYPES,
  type ReimbursementCreateInput,
} from '@/lib/validators/benefits';
import { reimbursementsApi, type Reimbursement } from '@/lib/api/benefits';
import { ApiError } from '@/lib/api/client';
import { Field, Input, Select, DatePicker, Textarea, useToast } from '@/components/ui';
import { FormWizard, type WizardStep } from '@/components/forms/FormWizard';
import { useEmployeeOptions } from '@/hooks/useEmployeeOptions';

/** Page-based reimbursement claim wizard shared by the New and Edit routes. */
export function ReimbursementForm({ reimbursement }: { reimbursement?: Reimbursement | null }) {
  const router = useRouter();
  const toast = useToast();
  const employeeOptions = useEmployeeOptions();
  const isEdit = Boolean(reimbursement);

  const methods = useForm<ReimbursementCreateInput>({
    resolver: zodResolver(reimbursementCreateSchema),
    mode: 'onTouched',
    defaultValues: reimbursement
      ? {
          employeeId: reimbursement.employee.id,
          type: reimbursement.type as ReimbursementCreateInput['type'],
          amount: reimbursement.amount,
          date: reimbursement.date?.slice(0, 10) as unknown as Date,
          description: reimbursement.description,
          receiptUrl: reimbursement.receiptUrl ?? '',
        }
      : { type: 'Other' },
  });

  const {
    register,
    formState: { errors, isSubmitting },
  } = methods;

  async function onSubmit(values: ReimbursementCreateInput) {
    try {
      if (isEdit && reimbursement) {
        await reimbursementsApi.update(reimbursement.id, values);
        toast.success('Claim updated');
      } else {
        await reimbursementsApi.create(values);
        toast.success('Claim raised', 'Submitted for approval.');
      }
      router.push('/benefits?tab=reimbursements');
      router.refresh();
    } catch (err) {
      toast.error('Could not save claim', err instanceof ApiError ? err.message : undefined);
    }
  }

  const steps: WizardStep[] = [
    {
      id: 'claim',
      label: 'Claim',
      description: 'Who is claiming, what type and how much.',
      fields: ['employeeId', 'type', 'amount', 'date'],
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Employee" required error={errors.employeeId?.message} className="sm:col-span-2">
            <Select
              {...register('employeeId')}
              invalid={!!errors.employeeId}
              placeholder="Select employee"
              options={employeeOptions}
              disabled={isEdit}
            />
          </Field>
          <Field label="Type" error={errors.type?.message}>
            <Select {...register('type')} invalid={!!errors.type} options={REIMBURSEMENT_TYPES.map((t) => ({ label: t, value: t }))} />
          </Field>
          <Field label="Amount (₹)" required error={errors.amount?.message}>
            <Input type="number" step="0.01" min="0" {...register('amount')} invalid={!!errors.amount} placeholder="2500" />
          </Field>
          <Field label="Date" required error={errors.date?.message} hint="Date the expense was incurred">
            <DatePicker {...register('date')} invalid={!!errors.date} />
          </Field>
        </div>
      ),
    },
    {
      id: 'details',
      label: 'Details',
      description: 'Supporting note and receipt.',
      fields: ['description', 'receiptUrl'],
      content: (
        <div className="grid grid-cols-1 gap-4">
          <Field label="Description" error={errors.description?.message}>
            <Textarea {...register('description')} invalid={!!errors.description} rows={2} placeholder="Optional note about this claim" />
          </Field>
          <Field label="Receipt URL" error={errors.receiptUrl?.message} hint="Link to an uploaded receipt or invoice">
            <Input {...register('receiptUrl')} invalid={!!errors.receiptUrl} placeholder="https://…" />
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
        submitLabel={isEdit ? 'Save changes' : 'Raise claim'}
        onCancel={() => router.back()}
      />
    </FormProvider>
  );
}
