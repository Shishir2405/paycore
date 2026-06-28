'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, DotsThreeVertical, PencilSimple, Trash } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { salaryStructuresApi, type SalaryStructure } from '@/lib/api/payroll';
import { ApiError } from '@/lib/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { INR } from '@/components/modules/payroll/format';
import {
  Badge,
  Button,
  Dropdown,
  DropdownItem,
  FilterBar,
  Table,
  type TableColumn,
  useToast,
} from '@/components/ui';

export default function SalaryStructuresPage() {
  return (
    <Suspense fallback={null}>
      <SalaryStructuresView />
    </Suspense>
  );
}

function SalaryStructuresView() {
  const router = useRouter();
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const list = useList<SalaryStructure>('/salary-structures', {
    initialSortBy: 'createdAt',
    initialSortDir: 'desc',
  });

  const [toDelete, setToDelete] = useState<SalaryStructure | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await salaryStructuresApi.remove(toDelete.id);
      toast.success('Structure deleted');
      setToDelete(null);
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  const columns: TableColumn<SalaryStructure>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (s) => (
        <div>
          <p className="font-medium text-fg">{s.employee.fullName ?? '—'}</p>
          {s.employee.employeeCode && <p className="text-xs text-muted">{s.employee.employeeCode}</p>}
        </div>
      ),
    },
    { key: 'basic', header: 'Basic', align: 'right', render: (s) => INR.format(s.basic) },
    { key: 'gross', header: 'Gross', align: 'right', render: (s) => INR.format(s.gross) },
    {
      key: 'version',
      header: 'Version',
      width: 'w-24',
      render: (s) => <span className="font-mono text-xs text-fg-subtle">v{s.version}</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      width: 'w-24',
      render: (s) => (
        <Badge tone={s.isActive ? 'success' : 'neutral'} dot>
          {s.isActive ? 'Active' : 'Superseded'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (s) =>
        (can('payroll:edit') || can('payroll:edit')) && (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            {can('payroll:edit') && (
              <DropdownItem
                icon={<PencilSimple size={16} />}
                onClick={() => router.push(`/payroll/salary-structures/${s.id}/edit`)}
              >
                Edit
              </DropdownItem>
            )}
            {can('payroll:edit') && (
              <DropdownItem icon={<Trash size={16} />} danger onClick={() => setToDelete(s)}>
                Delete
              </DropdownItem>
            )}
          </Dropdown>
        ),
    },
  ];

  return (
    <div>
      <button
        onClick={() => router.push('/payroll')}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft size={15} /> Back to payroll
      </button>

      <PageHeader
        title="Salary Structures"
        description="Versioned, per-employee compensation that the payroll engine evaluates each cycle."
        actions={
          can('payroll:create') && (
            <Button
              icon={<Plus size={16} weight="bold" />}
              onClick={() => router.push('/payroll/salary-structures/new')}
            >
              Add Structure
            </Button>
          )
        }
      />

      <div className="space-y-4">
        <FilterBar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search…"
        />
        {list.error ? (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {list.error}
          </div>
        ) : (
          <Table
            columns={columns}
            rows={list.rows}
            rowKey={(s) => s.id}
            loading={list.loading}
            emptyTitle="No salary structures"
            emptyDescription="Define a structure per employee before running payroll."
          />
        )}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete salary structure?"
        message={
          toDelete
            ? `Structure v${toDelete.version} for ${toDelete.employee.fullName ?? 'the employee'} will be removed.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
