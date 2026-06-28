'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Lifebuoy } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { HELPDESK_STATUSES } from '@/models/HelpdeskTicket';
import type { HelpdeskTicket } from '@/lib/api/ess';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { EssNav } from '@/components/modules/ess/EssNav';
import { HelpdeskTicketRow } from '@/components/modules/ess/HelpdeskTicketRow';
import { Button, FilterBar, Select, Pagination, LoadingState, EmptyState } from '@/components/ui';

const STATUS_LABELS: Record<string, string> = {
  Open: 'Open',
  InProgress: 'In progress',
  Resolved: 'Resolved',
  Closed: 'Closed',
};

function HelpdeskView() {
  const router = useRouter();
  const [status, setStatus] = useState('');

  const list = useList<HelpdeskTicket>('/ess/helpdesk', {
    initialSortBy: 'createdAt',
    initialSortDir: 'desc',
    filters: { status: status || undefined },
  });

  return (
    <div>
      <PageHeader
        title="Helpdesk"
        description="Raise queries and track responses from HR & support."
        actions={
          <Button icon={<Plus size={16} weight="bold" />} onClick={() => router.push('/ess/helpdesk/new')}>
            Raise ticket
          </Button>
        }
      />

      <EssNav />

      <div className="space-y-4">
        <FilterBar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search tickets…"
          filters={
            <div className="w-40">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { label: 'All statuses', value: '' },
                  ...HELPDESK_STATUSES.map((s) => ({ label: STATUS_LABELS[s] ?? s, value: s })),
                ]}
              />
            </div>
          }
        />

        {list.error ? (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {list.error}
          </div>
        ) : list.loading ? (
          <LoadingState />
        ) : list.rows.length === 0 ? (
          <EmptyState
            icon={<Lifebuoy size={22} />}
            title="No tickets yet"
            description="Raise a ticket and HR or support will get back to you here."
            action={
              <Button size="sm" icon={<Plus size={15} weight="bold" />} onClick={() => router.push('/ess/helpdesk/new')}>
                Raise ticket
              </Button>
            }
          />
        ) : (
          <>
            <div className="space-y-2">
              {list.rows.map((t) => (
                <HelpdeskTicketRow key={t.id} ticket={t} />
              ))}
            </div>
            {list.meta && list.meta.totalPages > 1 && (
              <Pagination meta={list.meta} onPageChange={list.setPage} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function EssHelpdeskPage() {
  return (
    <RequirePermission permission="ess:view">
      <HelpdeskView />
    </RequirePermission>
  );
}
