'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { leaveTypeCreateSchema, type LeaveTypeCreateInput } from '@/lib/validators/leave';
import { leaveTypesApi, type LeaveType } from '@/lib/api/leave';
import { ApiError } from '@/lib/api/client';
import { Modal, Field, Input, Textarea, Select, Button, useToast } from '@/components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Pass a leave type to edit; omit to create. */
  leaveType?: LeaveType | null;
};

export function LeaveTypeFormModal({ open, onClose, onSaved, leaveType }: Props) {
  const toast = useToast();
  const isEdit = Boolean(leaveType);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaveTypeCreateInput>({
    resolver: zodResolver(leaveTypeCreateSchema),
    defaultValues: leaveType
      ? {
          name: leaveType.name,
          code: leaveType.code,
          description: leaveType.description ?? '',
          annualQuota: leaveType.annualQuota,
          paid: leaveType.paid,
          carryForward: leaveType.carryForward,
          maxCarryForward: leaveType.maxCarryForward,
          isActive: leaveType.isActive,
        }
      : { annualQuota: 0, paid: true, carryForward: false, maxCarryForward: 0, isActive: true },
  });

  async function onSubmit(values: LeaveTypeCreateInput) {
    try {
      if (isEdit && leaveType) {
        await leaveTypesApi.update(leaveType.id, values);
        toast.success('Leave type updated');
      } else {
        await leaveTypesApi.create(values);
        toast.success('Leave type created');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save leave type', err instanceof ApiError ? err.message : undefined);
    }
  }

  const boolOptions = [
    { label: 'Yes', value: 'true' },
    { label: 'No', value: 'false' },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit leave type' : 'Add leave type'}
      description={isEdit ? `Updating ${leaveType?.code}` : 'Define a new leave policy'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="leave-type-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create leave type'}
          </Button>
        </>
      }
    >
      <form
        id="leave-type-form"
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Field label="Name" required error={errors.name?.message}>
          <Input {...register('name')} invalid={!!errors.name} placeholder="Casual Leave" />
        </Field>
        <Field label="Code" required error={errors.code?.message}>
          <Input {...register('code')} invalid={!!errors.code} placeholder="CL" className="uppercase" />
        </Field>
        <Field label="Annual quota (days)" error={errors.annualQuota?.message}>
          <Input type="number" step="0.5" min="0" {...register('annualQuota')} invalid={!!errors.annualQuota} />
        </Field>
        <Field label="Max carry forward (days)" error={errors.maxCarryForward?.message}>
          <Input type="number" step="0.5" min="0" {...register('maxCarryForward')} invalid={!!errors.maxCarryForward} />
        </Field>
        <Field label="Paid" error={errors.paid?.message}>
          <Select {...register('paid')} options={boolOptions} />
        </Field>
        <Field label="Carry forward" error={errors.carryForward?.message}>
          <Select {...register('carryForward')} options={boolOptions} />
        </Field>
        <Field label="Active" error={errors.isActive?.message}>
          <Select {...register('isActive')} options={boolOptions} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description" error={errors.description?.message}>
            <Textarea {...register('description')} rows={2} placeholder="Optional notes about this policy" />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
