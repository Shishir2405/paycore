'use client';

import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { payHeadCreateSchema, type PayHeadCreateInput } from '@/lib/validators/pay-head';
import { payHeadsApi, type PayHead } from '@/lib/api/pay-heads';
import { ApiError } from '@/lib/api/client';
import { PAY_HEAD_TYPES, PAY_HEAD_CALC_TYPES } from '@/models/PayHead';
import { Field, Input, Select, Textarea, useToast } from '@/components/ui';
import { FormWizard, type WizardStep } from '@/components/forms/FormWizard';

const CALC_TYPE_LABELS: Record<string, string> = {
  Flat: 'Flat amount (₹)',
  PercentOfBasic: '% of Basic',
  PercentOfGross: '% of Gross',
  Formula: 'Formula',
};

const VALUE_HINTS: Record<string, string> = {
  Flat: 'Fixed rupee amount applied each cycle',
  PercentOfBasic: 'Percentage of the Basic pay head',
  PercentOfGross: 'Percentage of gross earnings',
  Formula: 'Computed from the formula below',
};

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

/** Page-based, multi-step pay-head form shared by the New and Edit routes. */
export function PayHeadForm({ payHead }: { payHead?: PayHead | null }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(payHead);

  const methods = useForm<PayHeadCreateInput>({
    resolver: zodResolver(payHeadCreateSchema),
    mode: 'onTouched',
    defaultValues: payHead
      ? {
          name: payHead.name,
          code: payHead.code,
          type: payHead.type,
          calcType: payHead.calcType,
          value: payHead.value,
          formula: payHead.formula ?? '',
          taxable: payHead.taxable,
          isStatutory: payHead.isStatutory,
          affectsPf: payHead.affectsPf,
          affectsEsi: payHead.affectsEsi,
          displayOrder: payHead.displayOrder,
          isActive: payHead.isActive,
        }
      : { type: 'Earning', calcType: 'Flat', value: 0, taxable: true, isActive: true, displayOrder: 0 },
  });

  const {
    register,
    watch,
    formState: { errors, isSubmitting },
  } = methods;
  const calcType = watch('calcType');

  async function onSubmit(values: PayHeadCreateInput) {
    try {
      if (isEdit && payHead) {
        await payHeadsApi.update(payHead.id, values);
        toast.success('Pay head updated', `${values.name} saved.`);
      } else {
        await payHeadsApi.create(values);
        toast.success('Pay head created', `${values.name} added.`);
      }
      router.push('/pay-heads');
      router.refresh();
    } catch (err) {
      toast.error('Could not save pay head', err instanceof ApiError ? err.message : undefined);
    }
  }

  const steps: WizardStep[] = [
    {
      id: 'definition',
      label: 'Definition',
      description: 'What this component is and how it is calculated.',
      fields: ['name', 'code', 'type', 'calcType', 'value', 'formula', 'displayOrder'],
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" required error={errors.name?.message}>
            <Input {...register('name')} invalid={!!errors.name} placeholder="House Rent Allowance" autoFocus />
          </Field>
          <Field label="Code" required error={errors.code?.message} hint="Referenced in formulas as {CODE}">
            <Input {...register('code')} invalid={!!errors.code} placeholder="HRA" className="font-mono uppercase" />
          </Field>
          <Field label="Type" required error={errors.type?.message}>
            <Select {...register('type')} invalid={!!errors.type} options={PAY_HEAD_TYPES.map((t) => ({ label: t, value: t }))} />
          </Field>
          <Field label="Calculation" required error={errors.calcType?.message}>
            <Select
              {...register('calcType')}
              invalid={!!errors.calcType}
              options={PAY_HEAD_CALC_TYPES.map((t) => ({ label: CALC_TYPE_LABELS[t] ?? t, value: t }))}
            />
          </Field>
          {calcType !== 'Formula' && (
            <Field label={calcType === 'Flat' ? 'Amount (₹)' : 'Percentage (%)'} error={errors.value?.message} hint={VALUE_HINTS[calcType]}>
              <Input type="number" step="0.01" min="0" {...register('value')} invalid={!!errors.value} placeholder="0" />
            </Field>
          )}
          <Field label="Display order" error={errors.displayOrder?.message} hint="Lower shows first on payslips">
            <Input type="number" min="0" {...register('displayOrder')} invalid={!!errors.displayOrder} placeholder="0" />
          </Field>
          {calcType === 'Formula' && (
            <Field
              label="Formula"
              className="sm:col-span-2"
              required
              error={errors.formula?.message}
              hint="Use numbers, + - * / % ( ) and {CODE} references. e.g. {BASIC} * 0.4 + 1250"
            >
              <Textarea {...register('formula')} invalid={!!errors.formula} rows={2} placeholder="{BASIC} * 0.4" className="font-mono" />
            </Field>
          )}
        </div>
      ),
    },
    {
      id: 'treatment',
      label: 'Treatment',
      description: 'How payroll, tax and statutory engines treat this head.',
      fields: ['taxable', 'isStatutory', 'affectsPf', 'affectsEsi', 'isActive'],
      content: (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <CheckboxRow label="Taxable" hint="Included in taxable income" {...register('taxable')} />
          <CheckboxRow label="Statutory" hint="Mandated component (PF, ESI, PT…)" {...register('isStatutory')} />
          <CheckboxRow label="Affects PF" hint="Counts toward PF wage base" {...register('affectsPf')} />
          <CheckboxRow label="Affects ESI" hint="Counts toward ESI wage base" {...register('affectsEsi')} />
          <CheckboxRow label="Active" hint="Available for payroll runs" {...register('isActive')} />
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
        submitLabel={isEdit ? 'Save changes' : 'Create pay head'}
        onCancel={() => router.back()}
      />
    </FormProvider>
  );
}
