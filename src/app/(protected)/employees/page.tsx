'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, DotsThreeVertical, PencilSimple, Trash, DownloadSimple, UploadSimple, UsersThree } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { employeesApi, type Employee } from '@/lib/api/employees';
import { ApiError } from '@/lib/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmployeeFormModal } from '@/components/modules/employees/EmployeeFormModal';
import { ImportModal } from '@/components/modules/employees/ImportModal';
import {
  Badge,
  Button,
  Dropdown,
  DropdownItem,
  FilterBar,
  Pagination,
  Select,
  Table,
  type TableColumn,
  useToast,
} from '@/components/ui';

const STATUS_TONE: Record<string, 'success' | 'neutral' | 'warning' | 'danger' | 'info'> = {
  Active: 'success',
  Inactive: 'neutral',
  OnNotice: 'warning',
  Exited: 'danger',
  Onboarding: 'info',
};

export default function EmployeesPage() {
  return (
    <Suspense fallback={null}>
      <EmployeesView />
    </Suspense>
  );
}

function EmployeesView() {
  const params = useSearchParams();
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const [status, setStatus] = useState('');
  const list = useList<Employee>('/employees', {
    initialSortBy: 'employeeCode',
    initialSortDir: 'asc',
    filters: { status: status || undefined },
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Dashboard "Add Employee" quick action deep-links here with ?new=1.
  useEffect(() => {
    if (params.get('new') === '1' && can('employees:create')) {
      setEditing(null);
      setFormOpen(true);
    }
  }, [params, can]);

  async function handleDelete(emp: Employee) {
    if (!confirm(`Delete ${emp.fullName} (${emp.employeeCode})? This can be restored by an admin.`)) return;
    try {
      await employeesApi.remove(emp.id);
      toast.success('Employee deleted');
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  const columns: TableColumn<Employee>[] = [
    {
      key: 'employeeCode',
      header: 'Code',
      sortable: true,
      width: 'w-28',
      render: (e) => <span className="font-mono text-xs text-fg-subtle">{e.employeeCode}</span>,
    },
    {
      key: 'fullName',
      header: 'Name',
      sortable: true,
      render: (e) => (
        <div>
          <p className="font-medium text-fg">{e.fullName}</p>
          {e.email && <p className="text-xs text-muted">{e.email}</p>}
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (e) => e.phone ?? '—' },
    {
      key: 'employmentType',
      header: 'Type',
      render: (e) => <span className="text-fg-subtle">{e.employmentType ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => (
        <Badge tone={STATUS_TONE[e.status] ?? 'neutral'} dot>
          {e.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (e) =>
        (can('employees:edit') || can('employees:delete')) && (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            {can('employees:edit') && (
              <DropdownItem
                icon={<PencilSimple size={16} />}
                onClick={() => {
                  setEditing(e);
                  setFormOpen(true);
                }}
              >
                Edit
              </DropdownItem>
            )}
            {can('employees:delete') && (
              <DropdownItem icon={<Trash size={16} />} danger onClick={() => handleDelete(e)}>
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
        title="Employees"
        description="Manage your workforce master records."
        actions={
          can('employees:create') && (
            <Button
              icon={<Plus size={16} weight="bold" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add Employee
            </Button>
          )
        }
      />

      <div className="space-y-4">
        <FilterBar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search by name, code, or email…"
          filters={
            <div className="w-40">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                options={[
                  { label: 'All statuses', value: '' },
                  { label: 'Active', value: 'Active' },
                  { label: 'On Notice', value: 'OnNotice' },
                  { label: 'Inactive', value: 'Inactive' },
                  { label: 'Exited', value: 'Exited' },
                ]}
              />
            </div>
          }
          actions={
            <>
              {can('employees:import') && (
                <Button variant="outline" icon={<UploadSimple size={16} />} onClick={() => setImportOpen(true)}>
                  Import
                </Button>
              )}
              {can('employees:export') && (
                <Button
                  variant="outline"
                  icon={<DownloadSimple size={16} />}
                  onClick={() =>
                    window.open(employeesApi.exportUrl('xlsx', { status: status || undefined, search: list.search }), '_blank')
                  }
                >
                  Export
                </Button>
              )}
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
            rowKey={(e) => e.id}
            loading={list.loading}
            sortBy={list.sortBy}
            sortDir={list.sortDir}
            onSort={list.toggleSort}
            emptyTitle="No employees yet"
            emptyDescription="Add your first employee or import from a spreadsheet."
            emptyAction={
              can('employees:create') && (
                <Button
                  icon={<UsersThree size={16} weight="fill" />}
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  Add Employee
                </Button>
              )
            }
          />
        )}

        {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}
      </div>

      <EmployeeFormModal
        open={formOpen}
        employee={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => list.refetch()}
      />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => list.refetch()} />
    </div>
  );
}
