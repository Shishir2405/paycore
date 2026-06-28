'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, DotsThreeVertical, PencilSimple, Trash, Stack } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { payHeadsApi, type PayHead } from '@/lib/api/pay-heads';
import { ApiError } from '@/lib/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Badge,
  Button,
  Dropdown,
  DropdownItem,
  FilterBar,
  Select,
  Table,
  type TableColumn,
  useToast,
} from '@/components/ui';

const CALC_LABELS: Record<string, string> = {
  Flat: 'Flat',
  PercentOfBasic: '% Basic',
  PercentOfGross: '% Gross',
  Formula: 'Formula',
};

/** Human-readable description of how a pay head is computed. */
function calcSummary(h: PayHead): string {
  switch (h.calcType) {
    case 'Flat':
      return `₹${h.value.toLocaleString('en-IN')}`;
    case 'PercentOfBasic':
      return `${h.value}% of Basic`;
    case 'PercentOfGross':
      return `${h.value}% of Gross`;
    case 'Formula':
      return h.formula ?? '—';
    default:
      return '—';
  }
}

export default function PayHeadsPage() {
  return (
    <Suspense fallback={null}>
      <PayHeadsView />
    </Suspense>
  );
}

function PayHeadsView() {
  const router = useRouter();
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const [calcType, setCalcType] = useState('');
  // Pull a large page so we can group Earnings/Deductions on the client.
  const list = useList<PayHead>('/pay-heads', {
    initialSortBy: 'displayOrder',
    initialSortDir: 'asc',
    initialLimit: 100,
    filters: { calcType: calcType || undefined },
  });

  const [toDelete, setToDelete] = useState<PayHead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { earnings, deductions } = useMemo(() => {
    const e: PayHead[] = [];
    const d: PayHead[] = [];
    for (const h of list.rows) (h.type === 'Earning' ? e : d).push(h);
    return { earnings: e, deductions: d };
  }, [list.rows]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await payHeadsApi.remove(toDelete.id);
      toast.success('Pay head deleted', `${toDelete.name} removed.`);
      setToDelete(null);
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  function openCreate() {
    router.push('/pay-heads/new');
  }

  const columns: TableColumn<PayHead>[] = [
    {
      key: 'code',
      header: 'Code',
      width: 'w-28',
      render: (h) => <span className="font-mono text-xs text-fg-subtle">{h.code}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      render: (h) => (
        <div>
          <p className="font-medium text-fg">{h.name}</p>
          <p className="text-xs text-muted">{calcSummary(h)}</p>
        </div>
      ),
    },
    {
      key: 'calcType',
      header: 'Calc',
      width: 'w-24',
      render: (h) => <span className="text-fg-subtle">{CALC_LABELS[h.calcType] ?? h.calcType}</span>,
    },
    {
      key: 'flags',
      header: 'Flags',
      render: (h) => (
        <div className="flex flex-wrap gap-1">
          {h.taxable && <Badge tone="neutral">Taxable</Badge>}
          {h.isStatutory && <Badge tone="info">Statutory</Badge>}
          {h.affectsPf && <Badge tone="brand">PF</Badge>}
          {h.affectsEsi && <Badge tone="brand">ESI</Badge>}
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      width: 'w-24',
      render: (h) =>
        h.isActive ? (
          <Badge tone="success" dot>
            Active
          </Badge>
        ) : (
          <Badge tone="neutral" dot>
            Inactive
          </Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (h) =>
        (can('payheads:edit') || can('payheads:delete')) && (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            {can('payheads:edit') && (
              <DropdownItem icon={<PencilSimple size={16} />} onClick={() => router.push(`/pay-heads/${h.id}/edit`)}>
                Edit
              </DropdownItem>
            )}
            {can('payheads:delete') && (
              <DropdownItem icon={<Trash size={16} />} danger onClick={() => setToDelete(h)}>
                Delete
              </DropdownItem>
            )}
          </Dropdown>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pay Heads"
        description="Configure the earning and deduction components used to build salary structures."
        actions={
          can('payheads:create') && (
            <Button icon={<Plus size={16} weight="bold" />} onClick={openCreate}>
              Add Pay Head
            </Button>
          )
        }
      />

      <div className="space-y-6">
        <FilterBar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search by name or code…"
          filters={
            <div className="w-44">
              <Select
                value={calcType}
                onChange={(e) => setCalcType(e.target.value)}
                options={[
                  { label: 'All calc types', value: '' },
                  { label: 'Flat amount', value: 'Flat' },
                  { label: '% of Basic', value: 'PercentOfBasic' },
                  { label: '% of Gross', value: 'PercentOfGross' },
                  { label: 'Formula', value: 'Formula' },
                ]}
              />
            </div>
          }
        />

        {list.error ? (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {list.error}
          </div>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-fg">
                Earnings <span className="text-muted">({earnings.length})</span>
              </h2>
              <Table
                columns={columns}
                rows={earnings}
                rowKey={(h) => h.id}
                loading={list.loading}
                emptyTitle="No earning pay heads"
                emptyDescription="Add components like Basic, HRA, or special allowances."
                emptyAction={
                  can('payheads:create') && (
                    <Button icon={<Stack size={16} weight="fill" />} onClick={openCreate}>
                      Add Pay Head
                    </Button>
                  )
                }
              />
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-fg">
                Deductions <span className="text-muted">({deductions.length})</span>
              </h2>
              <Table
                columns={columns}
                rows={deductions}
                rowKey={(h) => h.id}
                loading={list.loading}
                emptyTitle="No deduction pay heads"
                emptyDescription="Add components like PF, ESI, Professional Tax, or loan recovery."
                emptyAction={
                  can('payheads:create') && (
                    <Button icon={<Stack size={16} weight="fill" />} onClick={openCreate}>
                      Add Pay Head
                    </Button>
                  )
                }
              />
            </section>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete pay head?"
        message={
          toDelete ? `${toDelete.name} (${toDelete.code}) will be removed. An admin can restore it later.` : undefined
        }
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
