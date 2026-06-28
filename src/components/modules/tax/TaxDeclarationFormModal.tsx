'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash } from '@phosphor-icons/react';
import { taxDeclarationCreateSchema, type TaxDeclarationCreateInput } from '@/lib/validators/tax';
import { taxApi, type TaxDeclaration } from '@/lib/api/tax';
import { ApiError } from '@/lib/api/client';
import { TAX_REGIMES } from '@/models/Employee';
import { Modal, Field, Input, Select, Button, useToast } from '@/components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Pass a declaration to edit; omit to create. */
  declaration?: TaxDeclaration | null;
};

/** Common Chapter VI-A section presets to seed a new declaration row. */
const SECTION_PRESETS: { code: string; label: string }[] = [
  { code: '80C', label: 'Investments (PF, ELSS, LIC)' },
  { code: '80D', label: 'Medical insurance' },
  { code: '80CCD1B', label: 'NPS contribution' },
  { code: '24B', label: 'Home loan interest' },
  { code: '80E', label: 'Education loan interest' },
  { code: '80G', label: 'Donations' },
];

const EMPTY_SECTION = { code: '', label: '', declaredAmount: 0, proofAmount: 0 };

export function TaxDeclarationFormModal({ open, onClose, onSaved, declaration }: Props) {
  const toast = useToast();
  const isEdit = Boolean(declaration);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaxDeclarationCreateInput>({
    resolver: zodResolver(taxDeclarationCreateSchema),
    defaultValues: {
      employeeId: '',
      financialYear: '2024-25',
      regime: 'New',
      sections: [{ ...EMPTY_SECTION }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'sections' });

  // Re-seed the form whenever the target declaration changes (or on open).
  useEffect(() => {
    if (!open) return;
    if (declaration) {
      reset({
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
      });
    } else {
      reset({
        employeeId: '',
        financialYear: '2024-25',
        regime: 'New',
        sections: [{ ...EMPTY_SECTION }],
      });
    }
  }, [open, declaration, reset]);

  async function onSubmit(values: TaxDeclarationCreateInput) {
    try {
      if (isEdit && declaration) {
        await taxApi.update(declaration.id, {
          regime: values.regime,
          sections: values.sections,
        });
        toast.success('Declaration updated');
      } else {
        await taxApi.create(values);
        toast.success('Declaration created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save declaration', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit tax declaration' : 'New tax declaration'}
      description={
        isEdit
          ? `${declaration?.financialYear} · ${declaration?.employeeName ?? declaration?.employeeCode ?? ''}`
          : 'Capture an employee investment declaration for a financial year'
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="tax-declaration-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create declaration'}
          </Button>
        </>
      }
    >
      <form id="tax-declaration-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="Employee ID"
            required
            error={errors.employeeId?.message}
            hint={isEdit ? undefined : 'Paste the employee record id'}
          >
            <Input
              {...register('employeeId')}
              invalid={!!errors.employeeId}
              disabled={isEdit}
              placeholder="6630…"
            />
          </Field>
          <Field label="Financial year" required error={errors.financialYear?.message}>
            <Input
              {...register('financialYear')}
              invalid={!!errors.financialYear}
              disabled={isEdit}
              placeholder="2024-25"
            />
          </Field>
          <Field label="Regime" error={errors.regime?.message}>
            <Select
              {...register('regime')}
              options={TAX_REGIMES.map((r) => ({ label: `${r} regime`, value: r }))}
            />
          </Field>
        </div>

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
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Plus size={14} weight="bold" />}
                onClick={() => append({ ...EMPTY_SECTION })}
              >
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
              <div
                key={field.id}
                className="grid grid-cols-12 items-end gap-2 rounded-md border border-border bg-surface-2/30 p-2"
              >
                <div className="col-span-3">
                  <Field label={idx === 0 ? 'Code' : undefined} error={errors.sections?.[idx]?.code?.message}>
                    <Input
                      {...register(`sections.${idx}.code` as const)}
                      invalid={!!errors.sections?.[idx]?.code}
                      placeholder="80C"
                      className="h-9 uppercase"
                    />
                  </Field>
                </div>
                <div className="col-span-4">
                  <Field label={idx === 0 ? 'Label' : undefined}>
                    <Input
                      {...register(`sections.${idx}.label` as const)}
                      placeholder="Investments"
                      className="h-9"
                    />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label={idx === 0 ? 'Declared' : undefined}>
                    <Input
                      type="number"
                      inputMode="numeric"
                      {...register(`sections.${idx}.declaredAmount` as const)}
                      placeholder="0"
                      className="h-9"
                    />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label={idx === 0 ? 'Proof' : undefined}>
                    <Input
                      type="number"
                      inputMode="numeric"
                      {...register(`sections.${idx}.proofAmount` as const)}
                      placeholder="0"
                      className="h-9"
                    />
                  </Field>
                </div>
                <div className="col-span-1 flex justify-end pb-1">
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                    aria-label="Remove section"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
