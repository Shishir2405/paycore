'use client';

import { useRouter } from 'next/navigation';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { designationCreateSchema, type DesignationCreateInput } from '@/lib/validators/designation';
import { designationsApi, type Designation } from '@/lib/api/designations';
import { ApiError } from '@/lib/api/client';
import { Field, Input, Textarea, useToast } from '@/components/ui';
import { FormWizard, type WizardStep } from '@/components/forms/FormWizard';

/** Page-based, multi-step designation form shared by the New and Edit routes. */
export function DesignationForm({ designation }: { designation?: Designation | null }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(designation);

  const methods = useForm<DesignationCreateInput>({
    resolver: zodResolver(designationCreateSchema),
    mode: 'onTouched',
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
        toast.success('Designation updated', `${values.name} saved.`);
      } else {
        await designationsApi.create(values);
        toast.success('Designation created', `${values.name} added.`);
      }
      router.push('/departments?tab=designations');
      router.refresh();
    } catch (err) {
      toast.error('Could not save designation', err instanceof ApiError ? err.message : undefined);
    }
  }

  const steps: WizardStep[] = [
    { id: 'identity', label: 'Identity', description: 'Title and unique code.', fields: ['name', 'code'], content: <IdentityStep /> },
    { id: 'grade', label: 'Grade', description: 'Grade, band and org level.', fields: ['grade', 'band', 'level'], content: <GradeStep /> },
    { id: 'comp', label: 'Compensation', description: 'Indicative CTC band and status.', fields: ['ctcRange', 'isActive', 'description'], content: <CompStep /> },
  ];

  return (
    <FormProvider {...methods}>
      <FormWizard
        steps={steps}
        onSubmit={methods.handleSubmit(onSubmit)}
        submitting={methods.formState.isSubmitting}
        submitLabel={isEdit ? 'Save changes' : 'Create designation'}
        onCancel={() => router.back()}
      />
    </FormProvider>
  );
}

function IdentityStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<DesignationCreateInput>();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Name" required error={errors.name?.message}>
        <Input {...register('name')} invalid={!!errors.name} placeholder="Software Engineer" autoFocus />
      </Field>
      <Field label="Code" required error={errors.code?.message} hint="Unique within your company">
        <Input {...register('code')} invalid={!!errors.code} placeholder="SWE" className="uppercase" />
      </Field>
    </div>
  );
}

function GradeStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<DesignationCreateInput>();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Field label="Grade" error={errors.grade?.message}>
        <Input {...register('grade')} placeholder="E3" />
      </Field>
      <Field label="Band" error={errors.band?.message}>
        <Input {...register('band')} placeholder="B2" />
      </Field>
      <Field label="Level" error={errors.level?.message} hint="Higher = senior">
        <Input type="number" min={0} step={1} {...register('level')} invalid={!!errors.level} placeholder="0" />
      </Field>
    </div>
  );
}

function CompStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<DesignationCreateInput>();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="CTC min (annual, INR)" error={errors.ctcRange?.min?.message}>
        <Input type="number" min={0} step="any" {...register('ctcRange.min')} placeholder="0" />
      </Field>
      <Field label="CTC max (annual, INR)" error={errors.ctcRange?.max?.message}>
        <Input type="number" min={0} step="any" {...register('ctcRange.max')} placeholder="0" />
      </Field>
      <Field label="Active">
        <label className="flex h-10 items-center gap-2 text-sm text-fg">
          <input type="checkbox" {...register('isActive')} className="h-4 w-4 rounded border-border accent-brand" />
          Designation is active
        </label>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description" error={errors.description?.message}>
          <Textarea {...register('description')} rows={3} placeholder="Responsibilities and scope…" />
        </Field>
      </div>
    </div>
  );
}
