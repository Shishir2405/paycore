'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeeCreateSchema, type EmployeeCreateInput } from '@/lib/validators/employee';
import { employeesApi, type Employee } from '@/lib/api/employees';
import { departmentsApi } from '@/lib/api/departments';
import { designationsApi } from '@/lib/api/designations';
import { ApiError } from '@/lib/api/client';
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from '@/models/Employee';
import { Field, Input, Select, DatePicker, useToast, type SelectOption } from '@/components/ui';
import { FormWizard, type WizardStep } from '@/components/forms/FormWizard';

/** Page-based 5-step employee wizard, shared by the New and Edit routes. */
export function EmployeeForm({ employee }: { employee?: Employee | null }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(employee);

  const [departments, setDepartments] = useState<SelectOption[]>([]);
  const [designations, setDesignations] = useState<SelectOption[]>([]);

  const methods = useForm<EmployeeCreateInput>({
    resolver: zodResolver(employeeCreateSchema),
    mode: 'onTouched',
    defaultValues: employee
      ? {
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email ?? '',
          phone: employee.phone,
          dateOfJoining: employee.dateOfJoining?.slice(0, 10) as unknown as Date,
          employmentType: employee.employmentType as EmployeeCreateInput['employmentType'],
          departmentId: employee.departmentId ?? undefined,
          designationId: employee.designationId ?? undefined,
          status: employee.status as EmployeeCreateInput['status'],
          uan: employee.uan,
        }
      : { status: 'Active' },
  });

  const {
    register,
    watch,
    formState: { errors, isSubmitting },
  } = methods;

  // Load select options for the Employment step.
  useEffect(() => {
    departmentsApi
      .list({ limit: 100, sortBy: 'name', sortDir: 'asc' })
      .then((r) => setDepartments(r.data.map((d) => ({ label: `${d.name} (${d.code})`, value: d.id }))))
      .catch(() => setDepartments([]));
    designationsApi
      .list({ limit: 100, sortBy: 'name', sortDir: 'asc' })
      .then((r) => setDesignations(r.data.map((d) => ({ label: `${d.name} (${d.code})`, value: d.id }))))
      .catch(() => setDesignations([]));
  }, []);

  async function onSubmit(values: EmployeeCreateInput) {
    try {
      if (isEdit && employee) {
        await employeesApi.update(employee.id, values);
        toast.success('Employee updated', `${values.firstName} ${values.lastName ?? ''}`.trim());
      } else {
        await employeesApi.create(values);
        toast.success('Employee created', `${values.firstName} ${values.lastName ?? ''}`.trim());
      }
      router.push('/employees');
      router.refresh();
    } catch (err) {
      toast.error('Could not save employee', err instanceof ApiError ? err.message : undefined);
    }
  }

  const secretHint = isEdit ? 'Leave blank to keep the existing value' : 'Encrypted at rest, masked in lists';

  const steps: WizardStep[] = [
    {
      id: 'personal',
      label: 'Personal',
      description: 'Who the employee is.',
      fields: ['firstName', 'lastName', 'email', 'phone', 'gender', 'dateOfBirth'],
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" required error={errors.firstName?.message}>
            <Input {...register('firstName')} invalid={!!errors.firstName} placeholder="Priya" autoFocus />
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
          <Field label="Gender" error={errors.gender?.message}>
            <Select
              {...register('gender')}
              placeholder="Select"
              options={['Male', 'Female', 'Other'].map((g) => ({ label: g, value: g }))}
            />
          </Field>
          <Field label="Date of birth" error={errors.dateOfBirth?.message}>
            <DatePicker {...register('dateOfBirth')} />
          </Field>
        </div>
      ),
    },
    {
      id: 'employment',
      label: 'Employment',
      description: 'Role, department and joining details.',
      fields: ['employeeCode', 'dateOfJoining', 'employmentType', 'departmentId', 'designationId', 'locationName', 'status'],
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Employee code" error={errors.employeeCode?.message} hint="Auto-generated if left blank">
            <Input {...register('employeeCode')} placeholder="EMP-0001" className="uppercase" />
          </Field>
          <Field label="Date of joining" required error={errors.dateOfJoining?.message}>
            <DatePicker {...register('dateOfJoining')} invalid={!!errors.dateOfJoining} />
          </Field>
          <Field label="Employment type" error={errors.employmentType?.message}>
            <Select {...register('employmentType')} placeholder="Select type" options={EMPLOYMENT_TYPES.map((t) => ({ label: t, value: t }))} />
          </Field>
          <Field label="Location" error={errors.locationName?.message}>
            <Input {...register('locationName')} placeholder="Mumbai HO" />
          </Field>
          <Field label="Department" error={errors.departmentId?.message}>
            <Select {...register('departmentId')} placeholder="Select department" options={departments} />
          </Field>
          <Field label="Designation" error={errors.designationId?.message}>
            <Select {...register('designationId')} placeholder="Select designation" options={designations} />
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <Select {...register('status')} options={EMPLOYEE_STATUSES.map((s) => ({ label: s, value: s }))} />
          </Field>
        </div>
      ),
    },
    {
      id: 'statutory',
      label: 'Statutory',
      description: 'Tax & compliance identifiers (encrypted).',
      fields: ['pan', 'aadhaar', 'uan', 'esicNumber'],
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="PAN" error={errors.pan?.message} hint={secretHint}>
            <Input {...register('pan')} invalid={!!errors.pan} placeholder="ABCDE1234F" className="uppercase" />
          </Field>
          <Field label="Aadhaar" error={errors.aadhaar?.message} hint={secretHint}>
            <Input {...register('aadhaar')} invalid={!!errors.aadhaar} placeholder="123412341234" />
          </Field>
          <Field label="UAN" error={errors.uan?.message}>
            <Input {...register('uan')} placeholder="100200300400" />
          </Field>
          <Field label="ESIC number" error={errors.esicNumber?.message}>
            <Input {...register('esicNumber')} placeholder="31001234560000001" />
          </Field>
        </div>
      ),
    },
    {
      id: 'bank',
      label: 'Bank',
      description: 'Salary disbursement account (encrypted).',
      fields: ['bank.accountNumber', 'bank.ifsc', 'bank.bankName', 'bank.accountHolderName'],
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Account number" error={errors.bank?.accountNumber?.message} hint={secretHint}>
            <Input {...register('bank.accountNumber')} placeholder="000111222333" />
          </Field>
          <Field label="IFSC" error={errors.bank?.ifsc?.message}>
            <Input {...register('bank.ifsc')} invalid={!!errors.bank?.ifsc} placeholder="HDFC0000123" className="uppercase" />
          </Field>
          <Field label="Bank name" error={errors.bank?.bankName?.message}>
            <Input {...register('bank.bankName')} placeholder="HDFC Bank" />
          </Field>
          <Field label="Account holder name" error={errors.bank?.accountHolderName?.message}>
            <Input {...register('bank.accountHolderName')} placeholder="Priya Sharma" />
          </Field>
        </div>
      ),
    },
    {
      id: 'review',
      label: 'Review',
      description: 'Confirm and save.',
      fields: [],
      content: <ReviewStep values={watch()} departments={departments} designations={designations} />,
    },
  ];

  return (
    <FormProvider {...methods}>
      <FormWizard
        steps={steps}
        onSubmit={methods.handleSubmit(onSubmit)}
        submitting={isSubmitting}
        submitLabel={isEdit ? 'Save changes' : 'Create employee'}
        onCancel={() => router.back()}
      />
    </FormProvider>
  );
}

function ReviewStep({
  values,
  departments,
  designations,
}: {
  values: EmployeeCreateInput;
  departments: SelectOption[];
  designations: SelectOption[];
}) {
  const dept = departments.find((d) => d.value === values.departmentId)?.label ?? '—';
  const desig = designations.find((d) => d.value === values.designationId)?.label ?? '—';
  const rows: [string, string][] = [
    ['Name', `${values.firstName ?? ''} ${values.lastName ?? ''}`.trim() || '—'],
    ['Email', values.email || '—'],
    ['Phone', values.phone || '—'],
    ['Employee code', values.employeeCode || 'Auto'],
    ['Employment type', values.employmentType || '—'],
    ['Department', dept],
    ['Designation', desig],
    ['PAN', values.pan ? '•••• provided' : '—'],
    ['Bank A/C', values.bank?.accountNumber ? '•••• provided' : '—'],
  ];
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between border-b border-border/60 py-1.5 text-sm">
          <dt className="text-muted">{label}</dt>
          <dd className="font-medium text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
