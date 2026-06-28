'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  DotsThreeVertical,
  PencilSimple,
  Trash,
  Buildings,
  IdentificationBadge,
} from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { departmentsApi, type Department } from '@/lib/api/departments';
import { designationsApi, type Designation } from '@/lib/api/designations';
import { ApiError } from '@/lib/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Badge,
  Button,
  Dropdown,
  DropdownItem,
  FilterBar,
  Pagination,
  Table,
  Tabs,
  type TableColumn,
  useToast,
} from '@/components/ui';

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

type TabKey = 'departments' | 'designations';

export default function DepartmentsPage() {
  const [tab, setTab] = useState<TabKey>('departments');

  // Support deep-links like /departments?tab=designations (used after saving).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'designations') {
      setTab('designations');
    }
  }, []);

  return (
    <div>
      <PageHeader
        title="Departments & Designations"
        description="Define your org structure: organisational units and job titles."
      />

      <div className="space-y-4">
        <Tabs
          items={[
            { key: 'departments', label: 'Departments' },
            { key: 'designations', label: 'Designations' },
          ]}
          value={tab}
          onChange={(k) => setTab(k as TabKey)}
        />

        {tab === 'departments' ? <DepartmentsTab /> : <DesignationsTab />}
      </div>
    </div>
  );
}

// ─── Departments tab ────────────────────────────────────────────────────────

function DepartmentsTab() {
  const router = useRouter();
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const list = useList<Department>('/departments', { initialSortBy: 'code', initialSortDir: 'asc' });

  const [toDelete, setToDelete] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await departmentsApi.remove(toDelete.id);
      toast.success('Department deleted', `${toDelete.name} removed.`);
      setToDelete(null);
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  const columns: TableColumn<Department>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      width: 'w-28',
      render: (d) => <span className="font-mono text-xs text-fg-subtle">{d.code}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (d) => (
        <div>
          <p className="font-medium text-fg">{d.name}</p>
          {d.description && <p className="line-clamp-1 text-xs text-muted">{d.description}</p>}
        </div>
      ),
    },
    {
      key: 'budgetAnnual',
      header: 'Annual budget',
      align: 'right',
      render: (d) => (d.budgetAnnual != null ? INR.format(d.budgetAnnual) : '—'),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (d) => (
        <Badge tone={d.isActive ? 'success' : 'neutral'} dot>
          {d.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (d) =>
        (can('departments:edit') || can('departments:delete')) && (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            {can('departments:edit') && (
              <DropdownItem icon={<PencilSimple size={16} />} onClick={() => router.push(`/departments/${d.id}/edit`)}>
                Edit
              </DropdownItem>
            )}
            {can('departments:delete') && (
              <DropdownItem icon={<Trash size={16} />} danger onClick={() => setToDelete(d)}>
                Delete
              </DropdownItem>
            )}
          </Dropdown>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search by name or code…"
        actions={
          can('departments:create') && (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => router.push('/departments/new')}>
              Add Department
            </Button>
          )
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
          rowKey={(d) => d.id}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          emptyTitle="No departments yet"
          emptyDescription="Create your first organisational unit."
          emptyAction={
            can('departments:create') && (
              <Button icon={<Buildings size={16} weight="fill" />} onClick={() => router.push('/departments/new')}>
                Add Department
              </Button>
            )
          }
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete department?"
        message={toDelete ? `${toDelete.name} (${toDelete.code}) will be removed. An admin can restore it.` : ''}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}

// ─── Designations tab ───────────────────────────────────────────────────────

function DesignationsTab() {
  const router = useRouter();
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const list = useList<Designation>('/designations', { initialSortBy: 'level', initialSortDir: 'desc' });

  const [toDelete, setToDelete] = useState<Designation | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await designationsApi.remove(toDelete.id);
      toast.success('Designation deleted', `${toDelete.name} removed.`);
      setToDelete(null);
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  const columns: TableColumn<Designation>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      width: 'w-28',
      render: (d) => <span className="font-mono text-xs text-fg-subtle">{d.code}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (d) => (
        <div>
          <p className="font-medium text-fg">{d.name}</p>
          {d.description && <p className="line-clamp-1 text-xs text-muted">{d.description}</p>}
        </div>
      ),
    },
    {
      key: 'grade',
      header: 'Grade / Band',
      render: (d) => <span className="text-fg-subtle">{[d.grade, d.band].filter(Boolean).join(' / ') || '—'}</span>,
    },
    { key: 'level', header: 'Level', sortable: true, align: 'right', width: 'w-20', render: (d) => d.level },
    {
      key: 'isActive',
      header: 'Status',
      render: (d) => (
        <Badge tone={d.isActive ? 'success' : 'neutral'} dot>
          {d.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (d) =>
        (can('departments:edit') || can('departments:delete')) && (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            {can('departments:edit') && (
              <DropdownItem icon={<PencilSimple size={16} />} onClick={() => router.push(`/designations/${d.id}/edit`)}>
                Edit
              </DropdownItem>
            )}
            {can('departments:delete') && (
              <DropdownItem icon={<Trash size={16} />} danger onClick={() => setToDelete(d)}>
                Delete
              </DropdownItem>
            )}
          </Dropdown>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search by name or code…"
        actions={
          can('departments:create') && (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => router.push('/designations/new')}>
              Add Designation
            </Button>
          )
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
          rowKey={(d) => d.id}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          emptyTitle="No designations yet"
          emptyDescription="Create job titles and grades for your org chart."
          emptyAction={
            can('departments:create') && (
              <Button icon={<IdentificationBadge size={16} weight="fill" />} onClick={() => router.push('/designations/new')}>
                Add Designation
              </Button>
            )
          }
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete designation?"
        message={toDelete ? `${toDelete.name} (${toDelete.code}) will be removed. An admin can restore it.` : ''}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}
