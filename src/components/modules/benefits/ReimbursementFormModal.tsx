'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  reimbursementCreateSchema,
  REIMBURSEMENT_TYPES,
  type ReimbursementCreateInput,
} from '@/lib/validators/benefits';
import { reimbursementsApi, type Reimbursement } from '@/lib/api/benefits';
import { ApiError } from '@/lib/api/client';
import { Modal, Field, Input, Select, DatePicker, Button, useToast } from '@/components/ui';
import { useEmployeeOptions } from './useEmployeeOptions';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Pass a claim to edit (pending only); omit to create. */
  claim?: Reimbursement | null;
};

export function ReimbursementFormModal({ open, onClose, onSaved, claim }: Props) {
  const toast = useToast();
  const isEdit = Boolean(claim);
  const employeeOptions = useEmployeeOptions(open);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReimbursementCreateInput>({
    resolver: zodResolver(reimbursementCreateSchema),
    defaultValues: claim
      ? {
          employeeId: claim.employee.id,
          type: claim.type as ReimbursementCreateInput['type'],
          amount: claim.amount,
          date: claim.date?.slice(0, 10) as unknown as Date,
          description: claim.description,
          receiptUrl: claim.receiptUrl ?? '',
        }
      : { type: 'Other' },
  });

  async function onSubmit(values: ReimbursementCreateInput) {
    try {
      if (isEdit && claim) {
        await reimbursementsApi.update(claim.id, values);
        toast.success('Claim updated');
      } else {
        await reimbursementsApi.create(values);
        toast.success('Claim raised');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save claim', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit reimbursement' : 'New reimbursement'}
      description={isEdit ? 'Only pending claims can be edited' : 'Raise an expense claim for approval'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="reimbursement-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Raise claim'}
          </Button>
        </>
      }
    >
      <form id="reimbursement-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Employee" required error={errors.employeeId?.message} className="sm:col-span-2">
          <Select
            {...register('employeeId')}
            invalid={!!errors.employeeId}
            placeholder="Select employee"
            options={employeeOptions}
            disabled={isEdit}
          />
        </Field>
        <Field label="Type" error={errors.type?.message}>
          <Select {...register('type')} options={REIMBURSEMENT_TYPES.map((t) => ({ label: t, value: t }))} />
        </Field>
        <Field label="Amount (₹)" required error={errors.amount?.message}>
          <Input type="number" step="0.01" min="0" {...register('amount')} invalid={!!errors.amount} placeholder="2500" />
        </Field>
        <Field label="Date" required error={errors.date?.message}>
          <DatePicker {...register('date')} invalid={!!errors.date} />
        </Field>
        <Field label="Receipt URL" error={errors.receiptUrl?.message}>
          <Input {...register('receiptUrl')} invalid={!!errors.receiptUrl} placeholder="https://…" />
        </Field>
        <Field label="Description" error={errors.description?.message} className="sm:col-span-2">
          <Input {...register('description')} placeholder="Optional note" />
        </Field>
      </form>
    </Modal>
  );
}
