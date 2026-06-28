'use client';

import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash } from '@phosphor-icons/react';
import { journalEntryCreateSchema } from '@/lib/validators/finance';
import { financeApi, type JournalEntry } from '@/lib/api/finance';
import { ApiError } from '@/lib/api/client';
import { Field, Input, Textarea, Button, useToast } from '@/components/ui';

type LineValues = { account: string; debit: number; credit: number; narration?: string };
type FormValues = { date: string; narration: string; lines: LineValues[] };

const today = () => new Date().toISOString().slice(0, 10);
const blankLine = (): LineValues => ({ account: '', debit: 0, credit: 0 });

/** Page-based journal voucher form with balanced debit/credit lines. */
export function JournalEntryForm({ entry }: { entry?: JournalEntry | null }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = Boolean(entry);

  const { register, handleSubmit, control, watch, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: entry
      ? {
          date: entry.date?.slice(0, 10) || today(),
          narration: entry.narration,
          lines: entry.lines.map((l) => ({ account: l.account, debit: l.debit, credit: l.credit, narration: l.narration })),
        }
      : { date: today(), narration: '', lines: [blankLine(), blankLine()] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines');
  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  async function onSubmit(values: FormValues) {
    // Validate with the shared schema (handles the debit=credit balance rule).
    const parsed = journalEntryCreateSchema.safeParse({
      ...values,
      lines: values.lines.map((l) => ({ ...l, debit: Number(l.debit || 0), credit: Number(l.credit || 0) })),
    });
    if (!parsed.success) {
      toast.error('Check the voucher', parsed.error.issues[0]?.message);
      return;
    }
    try {
      if (isEdit && entry) {
        await financeApi.journals.update(entry.id, parsed.data);
        toast.success('Voucher updated');
      } else {
        await financeApi.journals.create(parsed.data);
        toast.success('Voucher created');
      }
      router.push('/finance');
      router.refresh();
    } catch (err) {
      toast.error('Could not save voucher', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl">
      <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2">
        <Field label="Date" required>
          <Input type="date" {...register('date')} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Narration" required>
            <Textarea {...register('narration')} rows={2} placeholder="e.g. Salary payable for June 2026" />
          </Field>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg">Lines</h3>
          <Button type="button" size="sm" variant="outline" icon={<Plus size={14} weight="bold" />} onClick={() => append(blankLine())}>
            Add line
          </Button>
        </div>

        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-12 items-center gap-2">
              <div className="col-span-5">
                <Input {...register(`lines.${i}.account`)} placeholder="Account / ledger" />
              </div>
              <div className="col-span-3">
                <Input type="number" step="any" min={0} {...register(`lines.${i}.debit`)} placeholder="Debit" />
              </div>
              <div className="col-span-3">
                <Input type="number" step="any" min={0} {...register(`lines.${i}.credit`)} placeholder="Credit" />
              </div>
              <div className="col-span-1 flex justify-end">
                {fields.length > 2 && (
                  <button type="button" onClick={() => remove(i)} className="rounded p-1 text-muted hover:text-danger" aria-label="Remove line">
                    <Trash size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-end gap-6 border-t border-border pt-3 text-sm">
          <span className="text-muted">
            Debit <span className="font-mono font-medium text-fg">{totalDebit.toFixed(2)}</span>
          </span>
          <span className="text-muted">
            Credit <span className="font-mono font-medium text-fg">{totalCredit.toFixed(2)}</span>
          </span>
          <span className={balanced ? 'font-medium text-success' : 'font-medium text-danger'}>
            {balanced ? 'Balanced' : 'Out of balance'}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button type="submit" loading={isSubmitting} disabled={!balanced}>
          {isEdit ? 'Save changes' : 'Create voucher'}
        </Button>
        <Button variant="outline" type="button" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
