'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from '@phosphor-icons/react';
import { profileChangeCreateSchema, type ProfileChangeCreateInput } from '@/lib/validators/ess';
import { PROFILE_CHANGE_FIELDS } from '@/models/ProfileChangeRequest';
import { essApi } from '@/lib/api/ess';
import { ApiError } from '@/lib/api/client';
import { Field, Input, Textarea, Select, Button, useToast } from '@/components/ui';

/** Human labels + input hints for each self-requestable field. */
const FIELD_META: Record<(typeof PROFILE_CHANGE_FIELDS)[number], { label: string; hint: string; placeholder: string }> = {
  phone: { label: 'Phone number', hint: 'Your work contact number', placeholder: '+91 98765 43210' },
  personalEmail: { label: 'Personal email', hint: 'Used for non-work communication', placeholder: 'you@example.com' },
  currentAddress: { label: 'Current address', hint: 'Full residential address', placeholder: 'House, street, city, state, pincode' },
  emergencyContact: { label: 'Emergency contact', hint: 'Name, relationship and phone', placeholder: 'Name — Relationship — Phone' },
  bankAccount: { label: 'Bank account', hint: 'Account number and IFSC', placeholder: 'A/C number, IFSC, bank name' },
};

const FIELD_OPTIONS = PROFILE_CHANGE_FIELDS.map((f) => ({ label: FIELD_META[f].label, value: f }));

/** Lets an employee request a change to one editable personal detail. */
export function ProfileChangeForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const toast = useToast();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileChangeCreateInput>({
    resolver: zodResolver(profileChangeCreateSchema),
    defaultValues: { field: 'phone', newValue: '', reason: '' },
  });

  const field = watch('field');
  const meta = FIELD_META[field] ?? FIELD_META.phone;
  const isLong = field === 'currentAddress' || field === 'emergencyContact' || field === 'bankAccount';

  async function onSubmit(values: ProfileChangeCreateInput) {
    try {
      await essApi.submitProfileRequest(values);
      toast.success('Change requested', 'Your request has been sent to HR for approval.');
      reset({ field: values.field, newValue: '', reason: '' });
      onSubmitted?.();
    } catch (err) {
      toast.error('Could not submit request', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info/10 px-3 py-2.5 text-xs text-info">
        <Info size={16} weight="fill" className="mt-0.5 shrink-0" />
        <p>Changes don&apos;t apply immediately — HR reviews and approves each request before your record is updated.</p>
      </div>

      <Field label="Field to update" required error={errors.field?.message}>
        <Select {...register('field')} invalid={!!errors.field} options={FIELD_OPTIONS} />
      </Field>

      <Field label={`New ${meta.label.toLowerCase()}`} required error={errors.newValue?.message} hint={meta.hint}>
        {isLong ? (
          <Textarea {...register('newValue')} invalid={!!errors.newValue} rows={3} placeholder={meta.placeholder} />
        ) : (
          <Input {...register('newValue')} invalid={!!errors.newValue} placeholder={meta.placeholder} />
        )}
      </Field>

      <Field label="Reason" error={errors.reason?.message} hint="Optional — helps HR understand the change">
        <Textarea {...register('reason')} rows={2} placeholder="e.g. Moved to a new address" />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Submit request
        </Button>
      </div>
    </form>
  );
}
