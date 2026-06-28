'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Check, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

export type WizardStep = {
  id: string;
  label: string;
  description?: string;
  /** react-hook-form field names validated before this step can be left. */
  fields: string[];
  content: React.ReactNode;
};

/**
 * Multi-step ("3-step / 5-step") form wizard driven by react-hook-form.
 * Each step validates only its own fields (via `trigger`) before advancing, so
 * errors surface inline, step-by-step. Wrap in a <FormProvider> from the caller.
 */
export function FormWizard({
  steps,
  onSubmit,
  submitting,
  submitLabel = 'Submit',
  onCancel,
}: {
  steps: WizardStep[];
  /** Pass `methods.handleSubmit(onValid)` — invoked on the final step. */
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
}) {
  const { trigger } = useFormContext();
  const [current, setCurrent] = useState(0);
  const isLast = current === steps.length - 1;
  const step = steps[current];

  async function goNext() {
    const valid = await trigger(step.fields, { shouldFocus: true });
    if (valid) setCurrent((c) => Math.min(c + 1, steps.length - 1));
  }

  return (
    <div className="max-w-3xl">
      {/* Stepper */}
      <ol className="mb-6 flex items-center">
        {steps.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.id} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => i < current && setCurrent(i)}
                disabled={i > current}
                className={cn('flex items-center gap-2 text-left', i < current && 'cursor-pointer')}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                    done && 'border-brand bg-brand text-brand-fg',
                    active && 'border-brand text-brand',
                    !done && !active && 'border-border text-muted',
                  )}
                >
                  {done ? <Check size={13} weight="bold" /> : i + 1}
                </span>
                <span
                  className={cn(
                    'hidden text-xs font-medium sm:block',
                    active ? 'text-fg' : done ? 'text-fg-subtle' : 'text-muted',
                  )}
                >
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && <span className={cn('mx-2 h-px flex-1', done ? 'bg-brand' : 'bg-border')} />}
            </li>
          );
        })}
      </ol>

      {/* Active step */}
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-fg">{step.label}</h3>
          {step.description && <p className="mt-0.5 text-xs text-muted">{step.description}</p>}
        </div>
        {step.content}
      </div>

      {/* Navigation */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          {onCancel && (
            <Button variant="ghost" type="button" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {current > 0 && (
            <Button
              variant="outline"
              type="button"
              icon={<CaretLeft size={15} weight="bold" />}
              onClick={() => setCurrent((c) => Math.max(c - 1, 0))}
            >
              Back
            </Button>
          )}
          {isLast ? (
            <Button type="button" loading={submitting} onClick={onSubmit}>
              {submitLabel}
            </Button>
          ) : (
            <Button type="button" onClick={goNext}>
              Continue
              <CaretRight size={15} weight="bold" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
