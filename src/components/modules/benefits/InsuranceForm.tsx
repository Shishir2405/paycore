'use client';

import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insurancePolicyCreateSchema, type InsurancePolicyCreateInput } from '@/lib/validators/benefits';
import { insurancePoliciesApi, type InsurancePolicy } from '@/lib/api/benefits';
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

/** Page-based insurance policy wizard shared by the New and Edit routes. */
export function InsuranceForm({ policy }: { policy?: InsurancePolicy | null }) {
  const router = useRouter();
  const toast = useToast();
  const employeeOptions = useEmployeeOptions();
  const isEdit = Boolean(policy);

  const methods = useForm<InsurancePolicyCreateInput>({
    resolver: zodResolver(insurancePolicyCreateSchema),
    mode: 'onTouched',
    defaultValues: policy
      ? {
          employeeId: policy.employee.id,
          policyNo: policy.policyNo,
          provider: policy.provider,
          sumInsured: policy.sumInsured,
          premiumMonthly: policy.premiumMonthly,
          isActive: policy.isActive,
        }
      : { sumInsured: 0, premiumMonthly: 0, isActive: true },
  });

  const {
    register,
    formState: { errors, isSubmitting },
  } = methods;

  async function onSubmit(values: InsurancePolicyCreateInput) {
    try {
      if (isEdit && policy) {
        await insurancePoliciesApi.update(policy.id, values);
        toast.success('Policy updated', `${values.policyNo} saved.`);
      } else {
        await insurancePoliciesApi.create(values);
        toast.success('Policy added', `${values.policyNo} created.`);
      }
      router.push('/benefits?tab=insurance');
      router.refresh();
    } catch (err) {
      toast.error('Could not save policy', err instanceof ApiError ? err.message : undefined);
    }
  }

  const steps: WizardStep[] = [
    {
      id: 'policy',
      label: 'Policy',
      description: 'Who is covered and by whom.',
      fields: ['employeeId', 'policyNo', 'provider'],
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
          <Field label="Policy number" required error={errors.policyNo?.message}>
            <Input {...register('policyNo')} invalid={!!errors.policyNo} placeholder="POL-2026-00123" className="font-mono" />
          </Field>
          <Field label="Provider" required error={errors.provider?.message}>
            <Input {...register('provider')} invalid={!!errors.provider} placeholder="Star Health" />
          </Field>
        </div>
      ),
    },
    {
      id: 'coverage',
      label: 'Coverage',
      description: 'Sum insured, premium and status.',
      fields: ['sumInsured', 'premiumMonthly', 'isActive'],
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Sum insured (₹)" error={errors.sumInsured?.message} hint="Maximum coverage">
            <Input type="number" step="0.01" min="0" {...register('sumInsured')} invalid={!!errors.sumInsured} placeholder="500000" />
          </Field>
          <Field label="Monthly premium (₹)" error={errors.premiumMonthly?.message} hint="Deducted each cycle">
            <Input type="number" step="0.01" min="0" {...register('premiumMonthly')} invalid={!!errors.premiumMonthly} placeholder="1200" />
          </Field>
          <div className="sm:col-span-2">
            <CheckboxRow label="Active" hint="Policy is currently in force" {...register('isActive')} />
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
        submitLabel={isEdit ? 'Save changes' : 'Add policy'}
        onCancel={() => router.back()}
      />
    </FormProvider>
  );
}
