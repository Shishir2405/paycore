'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { designationCreateSchema, type DesignationCreateInput } from '@/lib/validators/designation';
import { designationsApi, type Designation } from '@/lib/api/designations';
import { ApiError } from '@/lib/api/client';
import { Modal, Field, Input, Textarea, Button, useToast } from '@/components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Pass a designation to edit; omit to create. */
  designation?: Designation | null;
};

export function DesignationFormModal({ open, onClose, onSaved, designation }: Props) {
  const toast = useToast();
  const isEdit = Boolean(designation);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DesignationCreateInput>({
    resolver: zodResolver(designationCreateSchema),
    defaultValues: designation
      ? {
          name: designation.name,
          code: designation.code,
          description: designation.description,
          grade: designation.grade,
          band: designation.band,
          level: designation.level,
          ctcRange: designation.ctcRange,
          isActive: designation.isActive,
        }
      : { isActive: true, level: 0 },
  });

  async function onSubmit(values: DesignationCreateInput) {
    try {
      if (isEdit && designation) {
        await designationsApi.update(designation.id, values);
        toast.success('Designation updated');
      } else {
        await designationsApi.create(values);
        toast.success('Designation created');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save designation', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit designation' : 'Add designation'}
      description={isEdit ? `Updating ${designation?.code}` : 'Create a new job title or grade'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="designation-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create designation'}
          </Button>
        </>
      }
    >
      <form id="designation-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" required error={errors.name?.message}>
          <Input {...register('name')} invalid={!!errors.name} placeholder="Software Engineer" />
        </Field>
        <Field label="Code" required error={errors.code?.message} hint="Unique within your company">
          <Input {...register('code')} invalid={!!errors.code} placeholder="SWE" className="uppercase" />
        </Field>
        <Field label="Grade" error={errors.grade?.message}>
          <Input {...register('grade')} placeholder="E3" />
        </Field>
        <Field label="Band" error={errors.band?.message}>
          <Input {...register('band')} placeholder="B2" />
        </Field>
        <Field label="Level" error={errors.level?.message} hint="Org-chart rank (higher = senior)">
          <Input type="number" min={0} step={1} {...register('level')} invalid={!!errors.level} placeholder="0" />
        </Field>
        <Field label="Active">
          <label className="flex h-9 items-center gap-2 text-sm text-fg">
            <input type="checkbox" {...register('isActive')} className="h-4 w-4 rounded border-border accent-brand" />
            Designation is active
          </label>
        </Field>
        <Field label="CTC min (annual, INR)" error={errors.ctcRange?.min?.message}>
          <Input type="number" min={0} step="any" {...register('ctcRange.min')} placeholder="0" />
        </Field>
        <Field label="CTC max (annual, INR)" error={errors.ctcRange?.max?.message}>
          <Input type="number" min={0} step="any" {...register('ctcRange.max')} placeholder="0" />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description" error={errors.description?.message}>
            <Textarea {...register('description')} rows={3} placeholder="Responsibilities and scope…" />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
