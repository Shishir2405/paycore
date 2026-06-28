'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  finalSettlementCreateSchema,
  type FinalSettlementCreateInput,
} from '@/lib/validators/payroll';
import { payrollApi, type FinalSettlement } from '@/lib/api/payroll';
import { ApiError } from '@/lib/api/client';
import { useEmployeeOptions } from '@/hooks/useEmployeeOptions';
import { Modal, Field, Select, Input, DatePicker, Textarea, Button, useToast } from '@/components/ui';

type Props = { open: boolean; onClose: () => void; onSaved: () => void; settlement?: FinalSettlement | null };

function isoDay(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export function FinalSettlementFormModal({ open, onClose, onSaved, settlement }: Props) {
  const toast = useToast();
  const employees = useEmployeeOptions();
  const isEdit = Boolean(settlement);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FinalSettlementCreateInput>({
    resolver: zodResolver(finalSettlementCreateSchema),
    defaultValues: settlement
      ? {
          employeeId: settlement.employee.id,
          lastWorkingDay: isoDay(settlement.lastWorkingDay) as unknown as Date,
          leaveEncashment: settlement.leaveEncashment,
          gratuity: settlement.gratuity,
          noticeRecovery: settlement.noticeRecovery,
          otherDues: settlement.otherDues,
          notes: settlement.notes ?? '',
        }
      : { leaveEncashment: 0, gratuity: 0, noticeRecovery: 0, otherDues: 0 },
  });

  async function onSubmit(values: FinalSettlementCreateInput) {
    try {
      if (isEdit && settlement) {
        await payrollApi.settlements.update(settlement.id, values);
        toast.success('Settlement updated');
      } else {
        await payrollApi.settlements.create(values);
        toast.success('Settlement created');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save settlement', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit final settlement' : 'New final settlement'}
      description="Net = leave encashment + gratuity + other dues − notice recovery."
      size="lg"
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="settlement-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create settlement'}
          </Button>
        </>
      }
    >
      <form id="settlement-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Employee" required error={errors.employeeId?.message}>
          <Select {...register('employeeId')} invalid={!!errors.employeeId} placeholder="Select employee" options={employees} />
        </Field>
        <Field label="Last working day" required error={errors.lastWorkingDay?.message}>
          <DatePicker {...register('lastWorkingDay')} invalid={!!errors.lastWorkingDay} />
        </Field>
        <Field label="Leave encashment (₹)" error={errors.leaveEncashment?.message}>
          <Input type="number" step="0.01" min="0" {...register('leaveEncashment')} placeholder="0" />
        </Field>
        <Field label="Gratuity (₹)" error={errors.gratuity?.message}>
          <Input type="number" step="0.01" min="0" {...register('gratuity')} placeholder="0" />
        </Field>
        <Field label="Other dues (₹)" error={errors.otherDues?.message}>
          <Input type="number" step="0.01" min="0" {...register('otherDues')} placeholder="0" />
        </Field>
        <Field label="Notice recovery (₹)" error={errors.noticeRecovery?.message} hint="Deducted from the settlement">
          <Input type="number" step="0.01" min="0" {...register('noticeRecovery')} placeholder="0" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes" error={errors.notes?.message}>
            <Textarea {...register('notes')} rows={2} placeholder="Optional" />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
