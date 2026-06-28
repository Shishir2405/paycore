'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { shiftCreateSchema, type ShiftCreateInput } from '@/lib/validators/shift';
import { shiftsApi, type Shift } from '@/lib/api/shifts';
import { ApiError } from '@/lib/api/client';
import { Modal, Field, Input, Button, useToast } from '@/components/ui';

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  shift?: Shift | null;
};

export function ShiftFormModal({ open, onClose, onSaved, shift }: Props) {
  const toast = useToast();
  const isEdit = Boolean(shift);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShiftCreateInput>({
    resolver: zodResolver(shiftCreateSchema),
    defaultValues: shift
      ? {
          name: shift.name,
          code: shift.code,
          startTime: shift.startTime,
          endTime: shift.endTime,
          breakMinutes: shift.breakMinutes,
          weeklyOffDays: shift.weeklyOffDays,
          isActive: shift.isActive,
        }
      : { startTime: '09:00', endTime: '18:00', breakMinutes: 60, weeklyOffDays: [0] },
  });

  async function onSubmit(values: ShiftCreateInput) {
    try {
      if (isEdit && shift) {
        await shiftsApi.update(shift.id, values);
        toast.success('Shift updated');
      } else {
        await shiftsApi.create(values);
        toast.success('Shift created');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save shift', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit shift' : 'Add shift'}
      description={isEdit ? `Updating ${shift?.code}` : 'Define a working window'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="shift-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create shift'}
          </Button>
        </>
      }
    >
      <form id="shift-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" required error={errors.name?.message}>
          <Input {...register('name')} invalid={!!errors.name} placeholder="General Shift" />
        </Field>
        <Field label="Code" required error={errors.code?.message}>
          <Input {...register('code')} invalid={!!errors.code} placeholder="GEN" className="uppercase" />
        </Field>
        <Field label="Start time" required error={errors.startTime?.message} hint="24h, HH:mm">
          <Input type="time" {...register('startTime')} invalid={!!errors.startTime} />
        </Field>
        <Field label="End time" required error={errors.endTime?.message} hint="24h, HH:mm">
          <Input type="time" {...register('endTime')} invalid={!!errors.endTime} />
        </Field>
        <Field label="Break (minutes)" error={errors.breakMinutes?.message}>
          <Input type="number" min={0} {...register('breakMinutes')} invalid={!!errors.breakMinutes} />
        </Field>
        <Field label="Weekly offs" className="sm:col-span-2" error={errors.weeklyOffDays?.message as string | undefined}>
          <Controller
            control={control}
            name="weeklyOffDays"
            render={({ field }) => {
              const selected = field.value ?? [];
              return (
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d) => {
                    const on = selected.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() =>
                          field.onChange(
                            on ? selected.filter((v) => v !== d.value) : [...selected, d.value].sort((a, b) => a - b),
                          )
                        }
                        className={
                          'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ' +
                          (on
                            ? 'border-brand bg-brand/10 text-brand'
                            : 'border-border text-muted hover:text-fg')
                        }
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              );
            }}
          />
        </Field>
      </form>
    </Modal>
  );
}
