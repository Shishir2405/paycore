'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { complianceItemCreateSchema, type ComplianceItemCreateInput } from '@/lib/validators/compliance';
import { complianceApi, type ComplianceItem } from '@/lib/api/compliance';
import { ApiError } from '@/lib/api/client';
import { COMPLIANCE_TYPES, COMPLIANCE_STATUSES } from '@/models/ComplianceItem';
import { Modal, Field, Input, Select, DatePicker, Button, useToast } from '@/components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  item?: ComplianceItem | null;
};

export function ComplianceItemFormModal({ open, onClose, onSaved, item }: Props) {
  const toast = useToast();
  const isEdit = Boolean(item);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ComplianceItemCreateInput>({
    resolver: zodResolver(complianceItemCreateSchema),
    defaultValues: item
      ? {
          type: item.type as ComplianceItemCreateInput['type'],
          period: item.period,
          dueDate: item.dueDate?.slice(0, 10) as unknown as Date,
          status: item.status as ComplianceItemCreateInput['status'],
          amount: item.amount,
          reference: item.reference,
          notes: item.notes,
        }
      : { status: 'Pending' as const },
  });

  async function onSubmit(values: ComplianceItemCreateInput) {
    try {
      if (isEdit && item) {
        await complianceApi.updateItem(item.id, values);
        toast.success('Compliance item updated');
      } else {
        await complianceApi.createItem(values);
        toast.success('Compliance item created');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save item', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit compliance item' : 'Add compliance item'}
      description={isEdit ? `Updating ${item?.type} · ${item?.period}` : 'Track a statutory filing obligation'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="compliance-item-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create item'}
          </Button>
        </>
      }
    >
      <form
        id="compliance-item-form"
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Field label="Type" required error={errors.type?.message}>
          <Select
            {...register('type')}
            placeholder="Select type"
            options={COMPLIANCE_TYPES.map((t) => ({ label: t, value: t }))}
          />
        </Field>
        <Field label="Period" required error={errors.period?.message} hint="e.g. 2026-06 or 2026-Q1">
          <Input {...register('period')} invalid={!!errors.period} placeholder="2026-06" />
        </Field>
        <Field label="Due date" required error={errors.dueDate?.message}>
          <DatePicker {...register('dueDate')} invalid={!!errors.dueDate} />
        </Field>
        <Field label="Amount (₹)" error={errors.amount?.message}>
          <Input type="number" step="0.01" {...register('amount')} invalid={!!errors.amount} placeholder="0" />
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <Select
            {...register('status')}
            options={COMPLIANCE_STATUSES.map((s) => ({ label: s, value: s }))}
          />
        </Field>
        <Field label="Reference" error={errors.reference?.message} hint="Challan / ack. number once filed">
          <Input {...register('reference')} placeholder="CRN-1234" />
        </Field>
        <Field label="Notes" error={errors.notes?.message} className="sm:col-span-2">
          <Input {...register('notes')} placeholder="Optional notes" />
        </Field>
      </form>
    </Modal>
  );
}
