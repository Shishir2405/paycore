'use client';

import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash } from '@phosphor-icons/react';
import { taxDeclarationCreateSchema, type TaxDeclarationCreateInput } from '@/lib/validators/tax';
import { taxApi, type TaxDeclaration } from '@/lib/api/tax';
import { ApiError } from '@/lib/api/client';
import { TAX_REGIMES } from '@/models/Employee';
import { Field, Input, Select, Button, useToast } from '@/components/ui';
import { FormWizard, type WizardStep } from '@/components/forms/FormWizard';

const SECTION_PRESETS: { code: string; label: string }[] = [
  { code: '80C', label: 'Investments (PF, ELSS, LIC)' },
  { code: '80D', label: 'Medical insurance' },
  { code: '80CCD1B', label: 'NPS contribution' },
  { code: '24B', label: 'Home loan interest' },
  { code: '80E', label: 'Education loan interest' },
  { code: '80G', label: 'Donations' },
];

const EMPTY_SECTION = { code: '', label: '', declaredAmount: 0, proofAmount: 0 };

/** Page-based, multi-step tax declaration form shared by the New and Edit routes. */
export function TaxDeclarationForm({ declaration }: { declaration?: TaxDeclaration | null }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(declaration);

  const methods = useForm<TaxDeclarationCreateInput>({
    resolver: zodResolver(taxDeclarationCreateSchema),
    mode: 'onTouched',
    defaultValues: declaration
      ? {
          employeeId: declaration.employeeId ?? '',
          financialYear: declaration.financialYear,
          regime: declaration.regime as TaxDeclarationCreateInput['regime'],
          sections: declaration.sections.length
            ? declaration.sections.map((s) => ({
                code: s.code,
                label: s.label ?? '',
                declaredAmount: s.declaredAmount,
                proofAmount: s.proofAmount,
              }))
            : [{ ...EMPTY_SECTION }],
        }
      : { employeeId: '', financialYear: '2024-25', regime: 'New', sections: [{ ...EMPTY_SECTION }] },
  });

  const {
    register,
    control,
    formState: { errors, isSubmitting },
  } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'sections' });

  async function onSubmit(values: TaxDeclarationCreateInput) {
    try {
      if (isEdit && declaration) {
        await taxApi.update(declaration.id, { regime: values.regime, sections: values.sections });
        toast.success('Declaration updated', `${values.financialYear} saved.`);
      } else {
        await taxApi.create(values);
        toast.success('Declaration created', `${values.financialYear} added.`);
      }
      router.push('/tax');
      router.refresh();
    } catch (err) {
      toast.error('Could not save declaration', err instanceof ApiError ? err.message : undefined);
    }
  }

  const steps: WizardStep[] = [
    {
      id: 'year',
      label: 'Year & regime',
      description: 'Whose declaration, for which financial year and tax regime.',
      fields: ['employeeId', 'financialYear', 'regime'],
      content: (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Employee ID" required error={errors.employeeId?.message} hint={isEdit ? undefined : 'Employee record id'}>
            <Input {...register('employeeId')} invalid={!!errors.employeeId} disabled={isEdit} placeholder="6630…" autoFocus />
          </Field>
          <Field label="Financial year" required error={errors.financialYear?.message}>
            <Input {...register('financialYear')} invalid={!!errors.financialYear} disabled={isEdit} placeholder="2024-25" />
          </Field>
          <Field label="Regime" error={errors.regime?.message}>
            <Select {...register('regime')} options={TAX_REGIMES.map((r) => ({ label: `${r} regime`, value: r }))} />
          </Field>
        </div>
      ),
    },
    {
      id: 'investments',
      label: 'Investments',
      description: 'Declare Chapter VI-A deductions and proof amounts.',
      fields: ['sections'],
      content: (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-fg">Sections</span>
            <div className="flex items-center gap-2">
              <Select
                aria-label="Add preset section"
                value=""
                placeholder="Add preset…"
                className="h-8 w-44 text-xs"
                onChange={(e) => {
                  const preset = SECTION_PRESETS.find((p) => p.code === e.target.value);
                  if (preset) append({ ...EMPTY_SECTION, code: preset.code, label: preset.label });
                  e.target.value = '';
                }}
                options={SECTION_PRESETS.map((p) => ({ label: `${p.code} — ${p.label}`, value: p.code }))}
              />
              <Button type="button" variant="outline" size="sm" icon={<Plus size={14} weight="bold" />} onClick={() => append({ ...EMPTY_SECTION })}>
                Add
              </Button>
            </div>
          </div>

          {fields.length === 0 && (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
              No sections yet. Add a deduction section to declare investments.
            </p>
          )}

          <div className="space-y-2">
            {fields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-12 items-end gap-2 rounded-md border border-border bg-surface-2/30 p-2">
                <div className="col-span-3">
                  <Field label={idx === 0 ? 'Code' : undefined} error={errors.sections?.[idx]?.code?.message}>
                    <Input {...register(`sections.${idx}.code` as const)} invalid={!!errors.sections?.[idx]?.code} placeholder="80C" className="h-9 uppercase" />
                  </Field>
                </div>
                <div className="col-span-4">
                  <Field label={idx === 0 ? 'Label' : undefined}>
                    <Input {...register(`sections.${idx}.label` as const)} placeholder="Investments" className="h-9" />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label={idx === 0 ? 'Declared' : undefined}>
                    <Input type="number" inputMode="numeric" {...register(`sections.${idx}.declaredAmount` as const)} placeholder="0" className="h-9" />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label={idx === 0 ? 'Proof' : undefined}>
                    <Input type="number" inputMode="numeric" {...register(`sections.${idx}.proofAmount` as const)} placeholder="0" className="h-9" />
                  </Field>
                </div>
                <div className="col-span-1 flex justify-end pb-1">
                  <button type="button" onClick={() => remove(idx)} className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger" aria-label="Remove section">
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
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
        submitLabel={isEdit ? 'Save changes' : 'Create declaration'}
        onCancel={() => router.back()}
      />
    </FormProvider>
  );
}
