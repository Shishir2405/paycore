'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { departmentCreateSchema, type DepartmentCreateInput } from '@/lib/validators/department';
import { departmentsApi, type Department } from '@/lib/api/departments';
import { ApiError } from '@/lib/api/client';
import { Modal, Field, Input, Textarea, Button, useToast } from '@/components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Pass a department to edit; omit to create. */
  department?: Department | null;
};

export function DepartmentFormModal({ open, onClose, onSaved, department }: Props) {
  const toast = useToast();
  const isEdit = Boolean(department);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentCreateInput>({
    resolver: zodResolver(departmentCreateSchema),
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
        toast.success('Department updated');
      } else {
        await departmentsApi.create(values);
        toast.success('Department created');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save department', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit department' : 'Add department'}
      description={isEdit ? `Updating ${department?.code}` : 'Create a new organisational unit'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="department-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create department'}
          </Button>
        </>
      }
    >
      <form id="department-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" required error={errors.name?.message}>
          <Input {...register('name')} invalid={!!errors.name} placeholder="Engineering" />
        </Field>
        <Field label="Code" required error={errors.code?.message} hint="Unique within your company">
          <Input {...register('code')} invalid={!!errors.code} placeholder="ENG" className="uppercase" />
        </Field>
        <Field label="Annual budget (INR)" error={errors.budgetAnnual?.message}>
          <Input type="number" min={0} step="any" {...register('budgetAnnual')} invalid={!!errors.budgetAnnual} placeholder="0" />
        </Field>
        <Field label="Active">
          <label className="flex h-9 items-center gap-2 text-sm text-fg">
            <input type="checkbox" {...register('isActive')} className="h-4 w-4 rounded border-border accent-brand" />
            Department is active
          </label>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description" error={errors.description?.message}>
            <Textarea {...register('description')} rows={3} placeholder="What this team is responsible for…" />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
