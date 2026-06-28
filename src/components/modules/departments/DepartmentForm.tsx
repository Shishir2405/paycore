'use client';

import { useRouter } from 'next/navigation';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { departmentCreateSchema, type DepartmentCreateInput } from '@/lib/validators/department';
import { departmentsApi, type Department } from '@/lib/api/departments';
import { ApiError } from '@/lib/api/client';
import { Field, Input, Textarea, useToast } from '@/components/ui';
import { FormWizard, type WizardStep } from '@/components/forms/FormWizard';

/** Page-based, multi-step department form shared by the New and Edit routes. */
export function DepartmentForm({ department }: { department?: Department | null }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(department);

  const methods = useForm<DepartmentCreateInput>({
    resolver: zodResolver(departmentCreateSchema),
    mode: 'onTouched',
    defaultValues: department
      ? {
          name: department.name,
          code: department.code,
          description: department.description,
          budgetAnnual: department.budgetAnnual,
          isActive: department.isActive,
        }
      : { isActive: true },
  });

  async function onSubmit(values: DepartmentCreateInput) {
    try {
      if (isEdit && department) {
        await departmentsApi.update(department.id, values);
        toast.success('Department updated', `${values.name} saved.`);
      } else {
        await departmentsApi.create(values);
        toast.success('Department created', `${values.name} added.`);
      }
      router.push('/departments');
      router.refresh();
    } catch (err) {
      toast.error('Could not save department', err instanceof ApiError ? err.message : undefined);
    }
  }

  const steps: WizardStep[] = [
    { id: 'details', label: 'Details', description: 'Name and identifier for this unit.', fields: ['name', 'code', 'description'], content: <DetailsStep /> },
    { id: 'config', label: 'Budget & status', description: 'Optional budget and active state.', fields: ['budgetAnnual', 'isActive'], content: <ConfigStep /> },
  ];

  return (
    <FormProvider {...methods}>
      <FormWizard
        steps={steps}
        onSubmit={methods.handleSubmit(onSubmit)}
        submitting={methods.formState.isSubmitting}
        submitLabel={isEdit ? 'Save changes' : 'Create department'}
        onCancel={() => router.back()}
      />
    </FormProvider>
  );
}

function DetailsStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<DepartmentCreateInput>();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Name" required error={errors.name?.message}>
        <Input {...register('name')} invalid={!!errors.name} placeholder="Engineering" autoFocus />
      </Field>
      <Field label="Code" required error={errors.code?.message} hint="Unique within your company">
        <Input {...register('code')} invalid={!!errors.code} placeholder="ENG" className="uppercase" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description" error={errors.description?.message}>
          <Textarea {...register('description')} rows={3} placeholder="What this team is responsible for…" />
        </Field>
      </div>
    </div>
  );
}

function ConfigStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext<DepartmentCreateInput>();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Annual budget (INR)" error={errors.budgetAnnual?.message}>
        <Input type="number" min={0} step="any" {...register('budgetAnnual')} invalid={!!errors.budgetAnnual} placeholder="0" />
      </Field>
      <Field label="Active">
        <label className="flex h-10 items-center gap-2 text-sm text-fg">
          <input type="checkbox" {...register('isActive')} className="h-4 w-4 rounded border-border accent-brand" />
          Department is active
        </label>
      </Field>
    </div>
  );
}
