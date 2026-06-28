'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bonusCreateSchema, type BonusCreateInput } from '@/lib/validators/payroll';
import { payrollApi, type Bonus } from '@/lib/api/payroll';
import { ApiError } from '@/lib/api/client';
import { BONUS_TYPES } from '@/models/Bonus';
import { useEmployeeOptions } from '@/hooks/useEmployeeOptions';
import { Modal, Field, Select, Input, Textarea, Button, useToast } from '@/components/ui';
import { MONTH_OPTIONS } from './format';

type Props = { open: boolean; onClose: () => void; onSaved: () => void; bonus?: Bonus | null };

const now = new Date();

export function BonusFormModal({ open, onClose, onSaved, bonus }: Props) {
  const toast = useToast();
  const employees = useEmployeeOptions();
  const isEdit = Boolean(bonus);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BonusCreateInput>({
    resolver: zodResolver(bonusCreateSchema),
    defaultValues: bonus
      ? {
          employeeId: bonus.employee.id,
          type: bonus.type as BonusCreateInput['type'],
          amount: bonus.amount,
          month: bonus.month,
          year: bonus.year,
          notes: bonus.notes ?? '',
        }
      : { type: 'Discretionary', month: now.getMonth() + 1, year: now.getFullYear() },
  });

  async function onSubmit(values: BonusCreateInput) {
    try {
      if (isEdit && bonus) {
        await payrollApi.bonuses.update(bonus.id, values);
        toast.success('Bonus updated');
      } else {
        await payrollApi.bonuses.create(values);
        toast.success('Bonus added');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save bonus', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit bonus' : 'Add bonus'}
      size="md"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="bonus-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Add bonus'}
          </Button>
        </>
      }
    >
      <form id="bonus-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Employee" required error={errors.employeeId?.message}>
          <Select {...register('employeeId')} invalid={!!errors.employeeId} placeholder="Select employee" options={employees} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type" required error={errors.type?.message}>
            <Select {...register('type')} invalid={!!errors.type} options={BONUS_TYPES.map((t) => ({ label: t, value: t }))} />
          </Field>
          <Field label="Amount (₹)" required error={errors.amount?.message}>
            <Input type="number" step="0.01" min="0" {...register('amount')} invalid={!!errors.amount} placeholder="0" />
          </Field>
          <Field label="Month" required error={errors.month?.message}>
            <Select {...register('month')} invalid={!!errors.month} options={MONTH_OPTIONS} />
          </Field>
          <Field label="Year" required error={errors.year?.message}>
            <Input type="number" {...register('year')} invalid={!!errors.year} />
          </Field>
        </div>
        <Field label="Notes" error={errors.notes?.message}>
          <Textarea {...register('notes')} rows={2} placeholder="Optional" />
        </Field>
      </form>
    </Modal>
  );
}
