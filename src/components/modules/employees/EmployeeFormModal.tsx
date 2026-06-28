'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeeCreateSchema, type EmployeeCreateInput } from '@/lib/validators/employee';
import { employeesApi, type Employee } from '@/lib/api/employees';
import { ApiError } from '@/lib/api/client';
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from '@/models/Employee';
import { Modal, Field, Input, Select, DatePicker, Button, useToast } from '@/components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Pass an employee to edit; omit to create. */
  employee?: Employee | null;
};

export function EmployeeFormModal({ open, onClose, onSaved, employee }: Props) {
  const toast = useToast();
  const isEdit = Boolean(employee);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeCreateInput>({
    resolver: zodResolver(employeeCreateSchema),
    defaultValues: employee
      ? {
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email ?? '',
          phone: employee.phone,
          dateOfJoining: employee.dateOfJoining?.slice(0, 10) as unknown as Date,
          employmentType: employee.employmentType as EmployeeCreateInput['employmentType'],
          status: employee.status as EmployeeCreateInput['status'],
          uan: employee.uan,
        }
      : undefined,
  });

  async function onSubmit(values: EmployeeCreateInput) {
    try {
      if (isEdit && employee) {
        await employeesApi.update(employee.id, values);
        toast.success('Employee updated');
      } else {
        await employeesApi.create(values);
        toast.success('Employee created');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save employee', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit employee' : 'Add employee'}
      description={isEdit ? `Updating ${employee?.employeeCode}` : 'Create a new employee record'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="employee-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create employee'}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" required error={errors.firstName?.message}>
          <Input {...register('firstName')} invalid={!!errors.firstName} placeholder="Priya" />
        </Field>
        <Field label="Last name" error={errors.lastName?.message}>
          <Input {...register('lastName')} placeholder="Sharma" />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register('email')} invalid={!!errors.email} placeholder="priya@company.com" />
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <Input {...register('phone')} placeholder="+91 98765 43210" />
        </Field>
        <Field label="Date of joining" required error={errors.dateOfJoining?.message}>
          <DatePicker {...register('dateOfJoining')} invalid={!!errors.dateOfJoining} />
        </Field>
        <Field label="Employment type" error={errors.employmentType?.message}>
          <Select
            {...register('employmentType')}
            placeholder="Select type"
            options={EMPLOYMENT_TYPES.map((t) => ({ label: t, value: t }))}
          />
        </Field>
        <Field label="PAN" error={errors.pan?.message} hint="Encrypted at rest, masked in lists">
          <Input {...register('pan')} invalid={!!errors.pan} placeholder="ABCDE1234F" className="uppercase" />
        </Field>
        <Field label="UAN" error={errors.uan?.message}>
          <Input {...register('uan')} placeholder="100200300400" />
        </Field>
        {isEdit && (
          <Field label="Status" error={errors.status?.message}>
            <Select
              {...register('status')}
              options={EMPLOYEE_STATUSES.map((s) => ({ label: s, value: s }))}
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}
