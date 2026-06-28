'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, PaperPlaneTilt } from '@phosphor-icons/react';
import { essApi, type HelpdeskTicket } from '@/lib/api/ess';
import { helpdeskRespondSchema, type HelpdeskRespondInput } from '@/lib/validators/ess';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/store/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { EssNav } from '@/components/modules/ess/EssNav';
import { HelpdeskStatusBadge } from '@/components/modules/ess/HelpdeskStatusBadge';
import { HelpdeskThread } from '@/components/modules/ess/HelpdeskThread';
import { formatDateTime } from '@/components/modules/ess/format';
import { Button, Field, Textarea, Card, CardBody, LoadingState, EmptyState, useToast } from '@/components/ui';

function TicketDetail({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const userName = useAuth((s) => s.user?.name);

  const [ticket, setTicket] = useState<HelpdeskTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const t = await essApi.getTicket(id);
      setTicket(t);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HelpdeskRespondInput>({
    resolver: zodResolver(helpdeskRespondSchema),
    defaultValues: { message: '' },
  });

  async function onReply(values: HelpdeskRespondInput) {
    try {
      const updated = await essApi.respondTicket(id, { message: values.message });
      setTicket(updated);
      reset({ message: '' });
      toast.success('Reply sent');
    } catch (err) {
      toast.error('Could not send reply', err instanceof ApiError ? err.message : undefined);
    }
  }

  const isClosed = ticket?.status === 'Closed';

  return (
    <div>
      <PageHeader
        title={ticket ? ticket.subject : 'Ticket'}
        description={ticket ? `${ticket.ticketNumber} · ${ticket.category} · Raised ${formatDateTime(ticket.createdAt)}` : undefined}
        actions={
          <Button variant="outline" size="sm" icon={<ArrowLeft size={15} />} onClick={() => router.push('/ess/helpdesk')}>
            Back
          </Button>
        }
      />

      <EssNav />

      {loading ? (
        <LoadingState />
      ) : error || !ticket ? (
        <EmptyState title="Couldn't load the ticket" description={error ?? 'It may have been removed.'} />
      ) : (
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="flex items-center justify-between">
            <HelpdeskStatusBadge status={ticket.status} />
            <span className="text-xs text-muted">Updated {formatDateTime(ticket.updatedAt)}</span>
          </div>

          <HelpdeskThread ticket={ticket} ownerName={userName} />

          <Card>
            <CardBody>
              {isClosed ? (
                <p className="text-center text-sm text-muted">This ticket is closed. Raise a new ticket if you need further help.</p>
              ) : (
                <form onSubmit={handleSubmit(onReply)} className="space-y-3">
                  <Field label="Add a reply" error={errors.message?.message}>
                    <Textarea {...register('message')} invalid={!!errors.message} rows={3} placeholder="Type your reply…" />
                  </Field>
                  <div className="flex justify-end">
                    <Button type="submit" loading={isSubmitting} icon={<PaperPlaneTilt size={15} weight="fill" />}>
                      Send reply
                    </Button>
                  </div>
                </form>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function HelpdeskTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequirePermission permission="ess:view">
      <TicketDetail id={id} />
    </RequirePermission>
  );
}
