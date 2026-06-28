'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ptSlabCreateSchema, type PtSlabCreateInput } from '@/lib/validators/compliance';
import { complianceApi, type PtSlab } from '@/lib/api/compliance';
import { ApiError } from '@/lib/api/client';
import { PT_FREQUENCIES } from '@/models/PTSlab';
import { Modal, Field, Input, Select, Button, useToast } from '@/components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  slab?: PtSlab | null;
};

export function PtSlabFormModal({ open, onClose, onSaved, slab }: Props) {
  const toast = useToast();
  const isEdit = Boolean(slab);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PtSlabCreateInput>({
    resolver: zodResolver(ptSlabCreateSchema),
    defaultValues: slab
      ? {
          stateCode: slab.stateCode,
          fromAmount: slab.fromAmount,
          toAmount: slab.toAmount,
          amount: slab.amount,
          frequency: slab.frequency as PtSlabCreateInput['frequency'],
          month: slab.month,
        }
      : { frequency: 'Monthly' as const, fromAmount: 0, amount: 0 },
  });

  async function onSubmit(values: PtSlabCreateInput) {
    try {
      if (isEdit && slab) {
        await complianceApi.updatePtSlab(slab.id, values);
        toast.success('PT slab updated');
      } else {
        await complianceApi.createPtSlab(values);
        toast.success('PT slab created');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save slab', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit PT slab' : 'Add PT slab'}
      description="Professional Tax slab for a state"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="pt-slab-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create slab'}
          </Button>
        </>
      }
    >
      <form id="pt-slab-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="State code" required error={errors.stateCode?.message} hint="e.g. MH, KA, 27">
          <Input {...register('stateCode')} invalid={!!errors.stateCode} placeholder="MH" className="uppercase" />
        </Field>
        <Field label="Frequency" error={errors.frequency?.message}>
          <Select {...register('frequency')} options={PT_FREQUENCIES.map((f) => ({ label: f, value: f }))} />
        </Field>
        <Field label="From amount (₹)" required error={errors.fromAmount?.message}>
          <Input type="number" {...register('fromAmount')} invalid={!!errors.fromAmount} placeholder="0" />
        </Field>
        <Field label="To amount (₹)" error={errors.toAmount?.message} hint="Leave blank for 'and above'">
          <Input type="number" {...register('toAmount')} invalid={!!errors.toAmount} placeholder="—" />
        </Field>
        <Field label="PT amount (₹)" required error={errors.amount?.message}>
          <Input type="number" {...register('amount')} invalid={!!errors.amount} placeholder="200" />
        </Field>
        <Field label="Month override" error={errors.month?.message} hint="1-12; e.g. 2 for Feb top-up">
          <Input type="number" min={1} max={12} {...register('month')} invalid={!!errors.month} placeholder="—" />
        </Field>
      </form>
    </Modal>
  );
}
