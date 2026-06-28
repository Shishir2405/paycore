'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { holidayCreateSchema, type HolidayCreateInput } from '@/lib/validators/holiday';
import { holidaysApi, type Holiday } from '@/lib/api/holidays';
import { ApiError } from '@/lib/api/client';
import { HOLIDAY_TYPES } from '@/models/Holiday';
import { Modal, Field, Input, Select, DatePicker, Button, useToast } from '@/components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  holiday?: Holiday | null;
};

export function HolidayFormModal({ open, onClose, onSaved, holiday }: Props) {
  const toast = useToast();
  const isEdit = Boolean(holiday);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HolidayCreateInput>({
    resolver: zodResolver(holidayCreateSchema),
    defaultValues: holiday
      ? {
          name: holiday.name,
          date: holiday.date?.slice(0, 10) as unknown as Date,
          type: holiday.type as HolidayCreateInput['type'],
          state: holiday.state,
          location: holiday.location,
        }
      : { type: 'Public' },
  });

  async function onSubmit(values: HolidayCreateInput) {
    try {
      if (isEdit && holiday) {
        await holidaysApi.update(holiday.id, values);
        toast.success('Holiday updated');
      } else {
        await holidaysApi.create(values);
        toast.success('Holiday created');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save holiday', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit holiday' : 'Add holiday'}
      description={isEdit ? `Updating ${holiday?.name}` : 'Add a calendar holiday'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="holiday-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create holiday'}
          </Button>
        </>
      }
    >
      <form id="holiday-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" required error={errors.name?.message} className="sm:col-span-2">
          <Input {...register('name')} invalid={!!errors.name} placeholder="Independence Day" />
        </Field>
        <Field label="Date" required error={errors.date?.message}>
          <DatePicker {...register('date')} invalid={!!errors.date} />
        </Field>
        <Field label="Type" error={errors.type?.message}>
          <Select {...register('type')} options={HOLIDAY_TYPES.map((t) => ({ label: t, value: t }))} />
        </Field>
        <Field label="State" error={errors.state?.message} hint="Leave blank for all locations">
          <Input {...register('state')} placeholder="Maharashtra" />
        </Field>
        <Field label="Location" error={errors.location?.message}>
          <Input {...register('location')} placeholder="Mumbai HQ" />
        </Field>
      </form>
    </Modal>
  );
}
