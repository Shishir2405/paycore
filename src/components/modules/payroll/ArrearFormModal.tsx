'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { arrearCreateSchema, type ArrearCreateInput } from '@/lib/validators/payroll';
import { payrollApi, type Arrear } from '@/lib/api/payroll';
import { ApiError } from '@/lib/api/client';
import { useEmployeeOptions } from '@/hooks/useEmployeeOptions';
import { Modal, Field, Select, Input, Textarea, Button, useToast } from '@/components/ui';
import { MONTH_OPTIONS } from './format';

type Props = { open: boolean; onClose: () => void; onSaved: () => void; arrear?: Arrear | null };

const now = new Date();

export function ArrearFormModal({ open, onClose, onSaved, arrear }: Props) {
  const toast = useToast();
  const employees = useEmployeeOptions();
  const isEdit = Boolean(arrear);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ArrearCreateInput>({
    resolver: zodResolver(arrearCreateSchema),
    defaultValues: arrear
      ? {
          employeeId: arrear.employee.id,
          month: arrear.month,
          year: arrear.year,
          amount: arrear.amount,
          reason: arrear.reason,
        }
      : { month: now.getMonth() + 1, year: now.getFullYear() },
  });

  async function onSubmit(values: ArrearCreateInput) {
    try {
      if (isEdit && arrear) {
        await payrollApi.arrears.update(arrear.id, values);
        toast.success('Arrear updated');
      } else {
        await payrollApi.arrears.create(values);
        toast.success('Arrear added');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save arrear', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit arrear' : 'Add arrear'}
      size="md"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="arrear-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Add arrear'}
          </Button>
        </>
      }
    >
      <form id="arrear-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Employee" required error={errors.employeeId?.message}>
          <Select {...register('employeeId')} invalid={!!errors.employeeId} placeholder="Select employee" options={employees} />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Month" required error={errors.month?.message}>
            <Select {...register('month')} invalid={!!errors.month} options={MONTH_OPTIONS} />
          </Field>
          <Field label="Year" required error={errors.year?.message}>
            <Input type="number" {...register('year')} invalid={!!errors.year} />
          </Field>
          <Field label="Amount (₹)" required error={errors.amount?.message}>
            <Input type="number" step="0.01" min="0" {...register('amount')} invalid={!!errors.amount} placeholder="0" />
          </Field>
        </div>
        <Field label="Reason" required error={errors.reason?.message}>
          <Textarea {...register('reason')} rows={2} placeholder="e.g. Back-dated increment for Apr–May" />
        </Field>
      </form>
    </Modal>
  );
}
