'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { helpdeskCreateSchema, type HelpdeskCreateInput } from '@/lib/validators/ess';
import { HELPDESK_CATEGORIES } from '@/models/HelpdeskTicket';
import { essApi } from '@/lib/api/ess';
import { ApiError } from '@/lib/api/client';
import { Field, Input, Textarea, Select, Button, useToast } from '@/components/ui';

/** Page-based form to raise a new helpdesk ticket. */
export function HelpdeskCreateForm() {
  const router = useRouter();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HelpdeskCreateInput>({
    resolver: zodResolver(helpdeskCreateSchema),
    defaultValues: { subject: '', category: 'Other', message: '' },
  });

  async function onSubmit(values: HelpdeskCreateInput) {
    try {
      const ticket = await essApi.createTicket(values);
      toast.success('Ticket raised', `${ticket.ticketNumber} created.`);
      router.push(`/ess/helpdesk/${ticket.id}`);
      router.refresh();
    } catch (err) {
      toast.error('Could not raise ticket', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-4 rounded-lg border border-border bg-surface p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Subject" required error={errors.subject?.message} className="sm:col-span-2">
          <Input {...register('subject')} invalid={!!errors.subject} placeholder="Briefly summarise your query" autoFocus />
        </Field>
        <Field label="Category" required error={errors.category?.message}>
          <Select
            {...register('category')}
            invalid={!!errors.category}
            options={HELPDESK_CATEGORIES.map((c) => ({ label: c, value: c }))}
          />
        </Field>
      </div>

      <Field label="Message" required error={errors.message?.message} hint="Describe your issue with as much detail as you can">
        <Textarea {...register('message')} invalid={!!errors.message} rows={5} placeholder="Tell us what you need help with…" />
      </Field>

      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Raise ticket
        </Button>
      </div>
    </form>
  );
}
