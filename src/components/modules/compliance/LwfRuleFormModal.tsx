'use client';

import { useForm } from 'react-hook-form';
// Validation is done manually in onSubmit (deductionMonths is a comma string in
// the UI), so we parse with lwfRuleCreateSchema there rather than via a resolver.
import { lwfRuleCreateSchema, type LwfRuleCreateInput } from '@/lib/validators/compliance';
import { complianceApi, type LwfRule } from '@/lib/api/compliance';
import { ApiError } from '@/lib/api/client';
import { LWF_FREQUENCIES } from '@/models/LWFRule';
import { Modal, Field, Input, Select, Button, useToast } from '@/components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  rule?: LwfRule | null;
};

/** Form value shape: deductionMonths is a comma string in the UI, parsed on submit. */
type FormValues = {
  stateCode: string;
  employeeAmount: number;
  employerAmount: number;
  frequency: LwfRuleCreateInput['frequency'];
  deductionMonths: string;
};

export function LwfRuleFormModal({ open, onClose, onSaved, rule }: Props) {
  const toast = useToast();
  const isEdit = Boolean(rule);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: rule
      ? {
          stateCode: rule.stateCode,
          employeeAmount: rule.employeeAmount,
          employerAmount: rule.employerAmount,
          frequency: rule.frequency as LwfRuleCreateInput['frequency'],
          deductionMonths: (rule.deductionMonths ?? []).join(', '),
        }
      : { frequency: 'HalfYearly' as const, employeeAmount: 0, employerAmount: 0, deductionMonths: '6, 12' },
  });

  async function onSubmit(values: FormValues) {
    const months = values.deductionMonths
      .split(',')
      .map((m) => Number.parseInt(m.trim(), 10))
      .filter((m) => Number.isFinite(m));

    const parsed = lwfRuleCreateSchema.safeParse({
      stateCode: values.stateCode,
      employeeAmount: values.employeeAmount,
      employerAmount: values.employerAmount,
      frequency: values.frequency,
      deductionMonths: months,
    });
    if (!parsed.success) {
      toast.error('Invalid input', parsed.error.issues[0]?.message);
      return;
    }

    try {
      if (isEdit && rule) {
        await complianceApi.updateLwfRule(rule.id, parsed.data);
        toast.success('LWF rule updated');
      } else {
        await complianceApi.createLwfRule(parsed.data);
        toast.success('LWF rule created');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save rule', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit LWF rule' : 'Add LWF rule'}
      description="Labour Welfare Fund rule for a state"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="lwf-rule-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create rule'}
          </Button>
        </>
      }
    >
      <form id="lwf-rule-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="State code" required error={errors.stateCode?.message} hint="e.g. MH, KA, 27">
          <Input {...register('stateCode')} invalid={!!errors.stateCode} placeholder="MH" className="uppercase" />
        </Field>
        <Field label="Frequency" error={errors.frequency?.message}>
          <Select {...register('frequency')} options={LWF_FREQUENCIES.map((f) => ({ label: f, value: f }))} />
        </Field>
        <Field label="Employee amount (₹)" required error={errors.employeeAmount?.message}>
          <Input type="number" {...register('employeeAmount')} invalid={!!errors.employeeAmount} placeholder="12" />
        </Field>
        <Field label="Employer amount (₹)" required error={errors.employerAmount?.message}>
          <Input type="number" {...register('employerAmount')} invalid={!!errors.employerAmount} placeholder="36" />
        </Field>
        <Field
          label="Deduction months"
          error={errors.deductionMonths?.message}
          hint="Comma-separated, e.g. 6, 12"
          className="sm:col-span-2"
        >
          <Input {...register('deductionMonths')} placeholder="6, 12" />
        </Field>
      </form>
    </Modal>
  );
}
