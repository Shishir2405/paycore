'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash } from '@phosphor-icons/react';
import { salaryStructureCreateSchema } from '@/lib/validators/payroll';
import { salaryStructuresApi, type SalaryStructure } from '@/lib/api/payroll';
import { ApiError } from '@/lib/api/client';
import { PAY_HEAD_TYPES } from '@/models/PayHead';
import { useEmployeeOptions } from '@/hooks/useEmployeeOptions';
import { Button, Field, Input, Select, useToast } from '@/components/ui';
import { FormWizard, type WizardStep } from '@/components/forms/FormWizard';
import { INR } from './format';

type HeadValue = {
  payHeadId?: string;
  code: string;
  name: string;
  type: 'Earning' | 'Deduction';
  amount: number;
};

type FormValues = {
  employeeId: string;
  effectiveFrom: Date;
  basic: number;
  heads: HeadValue[];
};

// The schema carries `.default()`s that widen the inferred input type; the form's
// concrete FormValues are the authoritative shape, so cast the resolver to match.
const resolver = zodResolver(salaryStructureCreateSchema) as unknown as Resolver<FormValues>;

function toDateInput(value?: string): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

/** Page-based salary structure form shared by the New and Edit routes. */
export function SalaryStructureForm({ structure }: { structure?: SalaryStructure | null }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(structure);
  const employeeOptions = useEmployeeOptions();

  const methods = useForm<FormValues>({
    resolver,
    mode: 'onTouched',
    defaultValues: structure
      ? {
          employeeId: structure.employee.id,
          effectiveFrom: toDateInput(structure.effectiveFrom) as unknown as Date,
          basic: structure.basic,
          heads: structure.heads.map((h) => ({
            payHeadId: h.payHeadId ?? '',
            code: h.code,
            name: h.name,
            type: h.type as 'Earning' | 'Deduction',
            amount: h.amount,
          })),
        }
      : {
          employeeId: '',
          effectiveFrom: new Date().toISOString().slice(0, 10) as unknown as Date,
          basic: 0,
          heads: [{ code: 'BASIC', name: 'Basic', type: 'Earning', amount: 0, payHeadId: '' }],
        },
  });

  const {
    register,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = methods;

  const { fields, append, remove } = useFieldArray({ control, name: 'heads' });
  const heads = watch('heads');

  const grossEarnings = useMemo(
    () =>
      (heads ?? [])
        .filter((h) => h.type === 'Earning')
        .reduce((s, h) => s + (Number(h.amount) || 0), 0),
    [heads],
  );

  async function onSubmit(values: FormValues) {
    // The form holds date strings + numeric strings; the zod schema on the server
    // coerces them. Pass the raw values through as the create/update payload.
    const payload = values as unknown as SalaryStructure;
    try {
      if (isEdit && structure) {
        await salaryStructuresApi.update(structure.id, payload as never);
        toast.success('Salary structure updated');
      } else {
        await salaryStructuresApi.create(payload as never);
        toast.success('Salary structure created', 'A new active version was recorded.');
      }
      router.push('/payroll/salary-structures');
      router.refresh();
    } catch (err) {
      toast.error('Could not save structure', err instanceof ApiError ? err.message : undefined);
    }
  }

  const steps: WizardStep[] = [
    {
      id: 'who',
      label: 'Employee & period',
      description: 'Whose compensation and from when this version applies.',
      fields: ['employeeId', 'effectiveFrom', 'basic'],
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Employee" required error={errors.employeeId?.message} className="sm:col-span-2">
            <Select
              {...register('employeeId')}
              invalid={!!errors.employeeId}
              placeholder="Select employee"
              options={employeeOptions}
              disabled={isEdit}
            />
          </Field>
          <Field label="Effective from" required error={errors.effectiveFrom?.message}>
            <Input type="date" {...register('effectiveFrom')} invalid={!!errors.effectiveFrom} />
          </Field>
          <Field label="Basic pay (₹)" required error={errors.basic?.message} hint="Anchors PF wage and % heads">
            <Input type="number" step="0.01" min="0" {...register('basic')} invalid={!!errors.basic} />
          </Field>
        </div>
      ),
    },
    {
      id: 'heads',
      label: 'Components',
      description: 'Earning and deduction heads that make up this structure.',
      fields: ['heads'],
      content: (
        <div className="space-y-3">
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-12 items-start gap-2">
                <div className="col-span-3">
                  <Input
                    {...register(`heads.${i}.code`)}
                    invalid={!!errors.heads?.[i]?.code}
                    placeholder="CODE"
                    className="font-mono uppercase"
                  />
                  {errors.heads?.[i]?.code && (
                    <p className="mt-1 text-xs text-danger">{errors.heads[i]?.code?.message}</p>
                  )}
                </div>
                <div className="col-span-4">
                  <Input
                    {...register(`heads.${i}.name`)}
                    invalid={!!errors.heads?.[i]?.name}
                    placeholder="Name"
                  />
                </div>
                <div className="col-span-2">
                  <Controller
                    control={control}
                    name={`heads.${i}.type`}
                    render={({ field }) => (
                      <Select {...field} options={PAY_HEAD_TYPES.map((t) => ({ label: t, value: t }))} />
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`heads.${i}.amount`)}
                    invalid={!!errors.heads?.[i]?.amount}
                    placeholder="0"
                  />
                </div>
                <div className="col-span-1 flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="rounded p-2 text-muted hover:bg-surface-2 hover:text-danger"
                    aria-label="Remove component"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            type="button"
            icon={<Plus size={15} weight="bold" />}
            onClick={() => append({ code: '', name: '', type: 'Earning', amount: 0, payHeadId: '' })}
          >
            Add component
          </Button>

          <div className="flex items-center justify-between rounded-md border border-border bg-surface-2/40 px-3 py-2 text-sm">
            <span className="text-muted">Monthly gross (earnings)</span>
            <span className="font-semibold text-fg">{INR.format(grossEarnings)}</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <FormProvider {...methods}>
      <FormWizard
        steps={steps}
        onSubmit={methods.handleSubmit(onSubmit)}
        submitting={isSubmitting}
        submitLabel={isEdit ? 'Save changes' : 'Create structure'}
        onCancel={() => router.back()}
      />
    </FormProvider>
  );
}
