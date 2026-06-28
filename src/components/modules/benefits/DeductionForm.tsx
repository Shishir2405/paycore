'use client';

import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { deductionCreateSchema, type DeductionCreateInput } from '@/lib/validators/benefits';
import { deductionsApi, type Deduction } from '@/lib/api/benefits';
import { ApiError } from '@/lib/api/client';
import { Field, Input, Select, useToast } from '@/components/ui';
import { FormWizard, type WizardStep } from '@/components/forms/FormWizard';
import { useEmployeeOptions } from '@/hooks/useEmployeeOptions';

function CheckboxRow({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-surface px-3 py-2">
      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-border accent-brand" {...props} />
      <span className="leading-tight">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** Page-based ad-hoc deduction wizard (single step) shared by New and Edit routes. */
export function DeductionForm({ deduction }: { deduction?: Deduction | null }) {
  const router = useRouter();
  const toast = useToast();
  const employeeOptions = useEmployeeOptions();
  const isEdit = Boolean(deduction);

  const methods = useForm<DeductionCreateInput>({
    resolver: zodResolver(deductionCreateSchema),
    mode: 'onTouched',
    defaultValues: deduction
      ? {
          employeeId: deduction.employee.id,
          name: deduction.name,
          amount: deduction.amount,
          month: deduction.month,
          recurring: deduction.recurring,
          isActive: deduction.isActive,
        }
      : { recurring: false, isActive: true },
  });

  const {
    register,
    formState: { errors, isSubmitting },
  } = methods;

  async function onSubmit(values: DeductionCreateInput) {
    try {
      if (isEdit && deduction) {
        await deductionsApi.update(deduction.id, values);
        toast.success('Deduction updated', `${values.name} saved.`);
      } else {
        await deductionsApi.create(values);
        toast.success('Deduction added', `${values.name} created.`);
      }
      router.push('/benefits?tab=deductions');
      router.refresh();
    } catch (err) {
      toast.error('Could not save deduction', err instanceof ApiError ? err.message : undefined);
    }
  }

  const steps: WizardStep[] = [
    {
      id: 'deduction',
      label: 'Deduction',
      description: 'A one-off or recurring amount withheld from pay.',
      fields: ['employeeId', 'name', 'amount', 'month', 'recurring', 'isActive'],
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
          <Field label="Name" required error={errors.name?.message}>
            <Input {...register('name')} invalid={!!errors.name} placeholder="Canteen recovery" />
          </Field>
          <Field label="Amount (₹)" required error={errors.amount?.message}>
            <Input type="number" step="0.01" min="0" {...register('amount')} invalid={!!errors.amount} placeholder="500" />
          </Field>
          <Field label="Month" required error={errors.month?.message} hint="Payroll month, e.g. 2026-06">
            <Input {...register('month')} invalid={!!errors.month} placeholder="2026-06" className="font-mono" />
          </Field>
          <div className="grid grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-2">
            <CheckboxRow label="Recurring" hint="Repeat every month from the start month" {...register('recurring')} />
            <CheckboxRow label="Active" hint="Applied in payroll runs" {...register('isActive')} />
          </div>
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
        submitLabel={isEdit ? 'Save changes' : 'Add deduction'}
        onCancel={() => router.back()}
      />
    </FormProvider>
  );
}
