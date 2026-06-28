'use client';

import { useEffect, useState } from 'react';
import { DownloadSimple } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { auditApi, type AuditLogEntry } from '@/lib/api/audit';
import { AUDIT_ACTIONS } from '@/lib/validators/audit';
import { PageHeader } from '@/components/layout/PageHeader';
import { AuditActionBadge } from '@/components/modules/audit/AuditActionBadge';
import { AuditDetailModal } from '@/components/modules/audit/AuditDetailModal';
import {
  Button,
  DatePicker,
  FilterBar,
  Pagination,
  Select,
  Table,
  type TableColumn,
} from '@/components/ui';

function fmtTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditPage() {
  const can = useAuth((s) => s.can);

  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [moduleOptions, setModuleOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  // Populate the module dropdown from the distinct keys present in this tenant's trail.
  useEffect(() => {
    auditApi
      .modules()
      .then(setModuleOptions)
      .catch(() => setModuleOptions([]));
  }, []);

  const list = useList<AuditLogEntry>('/audit', {
    initialSortBy: 'createdAt',
    initialSortDir: 'desc',
    filters: {
      module: module || undefined,
      action: action || undefined,
      from: from || undefined,
      to: to || undefined,
    },
  });

  const columns: TableColumn<AuditLogEntry>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      width: 'w-44',
      render: (r) => <span className="whitespace-nowrap text-fg-subtle">{fmtTimestamp(r.timestamp)}</span>,
    },
    {
      key: 'actorName',
      header: 'Actor',
      render: (r) => <span className="font-medium text-fg">{r.actorName}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      width: 'w-28',
      render: (r) => <AuditActionBadge action={r.action} />,
    },
    {
      key: 'module',
      header: 'Module',
      width: 'w-32',
      render: (r) => <span className="font-mono text-xs text-fg-subtle">{r.module}</span>,
    },
    {
      key: 'summary',
      header: 'Summary',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{r.summary}</p>
          {r.changeCount > 0 && (
            <p className="text-xs text-muted">
              {r.changeCount} field{r.changeCount === 1 ? '' : 's'} changed
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        description="Immutable record of every create, update, and delete across your account."
        actions={
          can('audit:export') && (
            <Button
              variant="outline"
              icon={<DownloadSimple size={16} />}
              onClick={() =>
                window.open(
                  auditApi.exportUrl({
                    module: module || undefined,
                    action: action || undefined,
                    from: from || undefined,
                    to: to || undefined,
                    search: list.search || undefined,
                    sortBy: list.sortBy,
                    sortDir: list.sortDir,
                  }),
                  '_blank',
                )
              }
            >
              Export CSV
            </Button>
          )
        }
      />

      <div className="space-y-4">
        <FilterBar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search actor, summary, or entity…"
          filters={
            <>
              <div className="w-40">
                <Select
                  value={module}
                  onChange={(e) => setModule(e.target.value)}
                  options={[
                    { label: 'All modules', value: '' },
                    ...moduleOptions.map((m) => ({ label: m, value: m })),
                  ]}
                />
              </div>
              <div className="w-36">
                <Select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  options={[
                    { label: 'All actions', value: '' },
                    ...AUDIT_ACTIONS.map((a) => ({ label: a, value: a })),
                  ]}
                />
              </div>
              <div className="w-40">
                <DatePicker value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
              </div>
              <div className="w-40">
                <DatePicker value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
              </div>
            </>
          }
        />

        {list.error ? (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {list.error}
          </div>
        ) : (
          <Table
            columns={columns}
            rows={list.rows}
            rowKey={(r) => r.id}
            loading={list.loading}
            sortBy={list.sortBy}
            sortDir={list.sortDir}
            onSort={list.toggleSort}
            onRowClick={(r) => setSelected(r)}
            emptyTitle="No audit activity"
            emptyDescription="Activity will appear here as your team makes changes."
          />
        )}

        {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}
      </div>

      <AuditDetailModal entry={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
