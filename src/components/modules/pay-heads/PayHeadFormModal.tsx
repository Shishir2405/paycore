'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { payHeadCreateSchema, type PayHeadCreateInput } from '@/lib/validators/pay-head';
import { payHeadsApi, type PayHead } from '@/lib/api/pay-heads';
import { ApiError } from '@/lib/api/client';
import { PAY_HEAD_TYPES, PAY_HEAD_CALC_TYPES } from '@/models/PayHead';
import { Modal, Field, Input, Select, Textarea, Button, useToast } from '@/components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Pass a pay head to edit; omit to create. */
  payHead?: PayHead | null;
};

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
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-border accent-brand"
        {...props}
      />
      <span className="leading-tight">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function PayHeadFormModal({ open, onClose, onSaved, payHead }: Props) {
  const toast = useToast();
  const isEdit = Boolean(payHead);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PayHeadCreateInput>({
    resolver: zodResolver(payHeadCreateSchema),
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
      : {
          type: 'Earning',
          calcType: 'Flat',
          value: 0,
          taxable: true,
          isActive: true,
          displayOrder: 0,
        },
  });

  const calcType = watch('calcType');

  async function onSubmit(values: PayHeadCreateInput) {
    try {
      if (isEdit && payHead) {
        await payHeadsApi.update(payHead.id, values);
        toast.success('Pay head updated');
      } else {
        await payHeadsApi.create(values);
        toast.success('Pay head created');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save pay head', err instanceof ApiError ? err.message : undefined);
    }
  }

  const showValue = calcType !== 'Formula';
  const showFormula = calcType === 'Formula';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit pay head' : 'Add pay head'}
      description={isEdit ? `Updating ${payHead?.code}` : 'Configure a salary component'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="pay-head-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create pay head'}
          </Button>
        </>
      }
    >
      <form id="pay-head-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" required error={errors.name?.message}>
          <Input {...register('name')} invalid={!!errors.name} placeholder="House Rent Allowance" />
        </Field>
        <Field label="Code" required error={errors.code?.message} hint="Referenced in formulas as {CODE}">
          <Input {...register('code')} invalid={!!errors.code} placeholder="HRA" className="uppercase font-mono" />
        </Field>

        <Field label="Type" required error={errors.type?.message}>
          <Select
            {...register('type')}
            invalid={!!errors.type}
            options={PAY_HEAD_TYPES.map((t) => ({ label: t, value: t }))}
          />
        </Field>
        <Field label="Calculation" required error={errors.calcType?.message}>
          <Select
            {...register('calcType')}
            invalid={!!errors.calcType}
            options={PAY_HEAD_CALC_TYPES.map((t) => ({ label: CALC_TYPE_LABELS[t] ?? t, value: t }))}
          />
        </Field>

        {showValue && (
          <Field
            label={calcType === 'Flat' ? 'Amount (₹)' : 'Percentage (%)'}
            error={errors.value?.message}
            hint={VALUE_HINTS[calcType]}
          >
            <Input type="number" step="0.01" min="0" {...register('value')} invalid={!!errors.value} placeholder="0" />
          </Field>
        )}

        <Field label="Display order" error={errors.displayOrder?.message} hint="Lower shows first on payslips">
          <Input type="number" min="0" {...register('displayOrder')} invalid={!!errors.displayOrder} placeholder="0" />
        </Field>

        {showFormula && (
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

        <div className="grid grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-2">
          <CheckboxRow label="Taxable" hint="Included in taxable income" {...register('taxable')} />
          <CheckboxRow label="Statutory" hint="Mandated component (PF, ESI, PT…)" {...register('isStatutory')} />
          <CheckboxRow label="Affects PF" hint="Counts toward PF wage base" {...register('affectsPf')} />
          <CheckboxRow label="Affects ESI" hint="Counts toward ESI wage base" {...register('affectsEsi')} />
          <CheckboxRow label="Active" hint="Available for payroll runs" {...register('isActive')} />
        </div>
      </form>
    </Modal>
  );
}
