'use client';

import { useState } from 'react';
import { Plus, DotsThreeVertical, PencilSimple, Trash, DownloadSimple, UploadSimple, ClockUser } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { attendanceApi, type Attendance } from '@/lib/api/attendance';
import { ApiError } from '@/lib/api/client';
import { AttendanceFormModal } from './AttendanceFormModal';
import { AttendanceImportModal } from './AttendanceImportModal';
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
  Present: 'success',
  Absent: 'danger',
  HalfDay: 'warning',
  Leave: 'info',
  Holiday: 'neutral',
  WeeklyOff: 'neutral',
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

export function AttendanceTab() {
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const [status, setStatus] = useState('');
  const list = useList<Attendance>('/attendance', {
    initialSortBy: 'date',
    initialSortDir: 'desc',
    filters: { status: status || undefined },
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Attendance | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  async function handleDelete(row: Attendance) {
    if (!confirm(`Delete attendance for ${row.employeeName ?? row.employeeCode ?? 'employee'} on ${fmtDate(row.date)}?`))
      return;
    try {
      await attendanceApi.remove(row.id);
      toast.success('Attendance deleted');
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  const columns: TableColumn<Attendance>[] = [
    {
      key: 'employeeName',
      header: 'Employee',
      render: (r) => (
        <div>
          <p className="font-medium text-fg">{r.employeeName ?? '—'}</p>
          {r.employeeCode && <p className="font-mono text-xs text-muted">{r.employeeCode}</p>}
        </div>
      ),
    },
    { key: 'date', header: 'Date', sortable: true, render: (r) => <span className="text-fg-subtle">{fmtDate(r.date)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge tone={STATUS_TONE[r.status] ?? 'neutral'} dot>
          {r.status}
        </Badge>
      ),
    },
    { key: 'inTime', header: 'In', render: (r) => r.inTime ?? '—' },
    { key: 'outTime', header: 'Out', render: (r) => r.outTime ?? '—' },
    { key: 'workedHours', header: 'Worked', render: (r) => <span className="tabular-nums">{r.workedHours.toFixed(2)}</span> },
    {
      key: 'overtimeHours',
      header: 'OT',
      render: (r) =>
        r.overtimeHours > 0 ? (
          <span className="tabular-nums font-medium text-brand">{r.overtimeHours.toFixed(2)}</span>
        ) : (
          <span className="text-muted">0.00</span>
        ),
    },
    { key: 'source', header: 'Source', render: (r) => <span className="text-xs text-muted">{r.source}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (r) =>
        (can('attendance:edit') || can('attendance:delete')) && (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            {can('attendance:edit') && (
              <DropdownItem
                icon={<PencilSimple size={16} />}
                onClick={() => {
                  setEditing(r);
                  setFormOpen(true);
                }}
              >
                Edit
              </DropdownItem>
            )}
            {can('attendance:delete') && (
              <DropdownItem icon={<Trash size={16} />} danger onClick={() => handleDelete(r)}>
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
        searchPlaceholder="Search by employee name or code…"
        filters={
          <div className="w-40">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { label: 'All statuses', value: '' },
                { label: 'Present', value: 'Present' },
                { label: 'Absent', value: 'Absent' },
                { label: 'Half Day', value: 'HalfDay' },
                { label: 'Leave', value: 'Leave' },
                { label: 'Holiday', value: 'Holiday' },
                { label: 'Weekly Off', value: 'WeeklyOff' },
              ]}
            />
          </div>
        }
        actions={
          <>
            {can('attendance:create') && (
              <Button
                icon={<Plus size={16} weight="bold" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Mark
              </Button>
            )}
            {can('attendance:import') && (
              <Button variant="outline" icon={<UploadSimple size={16} />} onClick={() => setImportOpen(true)}>
                Import
              </Button>
            )}
            {can('attendance:export') && (
              <Button
                variant="outline"
                icon={<DownloadSimple size={16} />}
                onClick={() =>
                  window.open(
                    attendanceApi.exportUrl('xlsx', { status: status || undefined, search: list.search }),
                    '_blank',
                  )
                }
              >
                Export
              </Button>
            )}
          </>
        }
      />

      {list.error ? (
        <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{list.error}</div>
      ) : (
        <Table
          columns={columns}
          rows={list.rows}
          rowKey={(r) => r.id}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          emptyTitle="No attendance yet"
          emptyDescription="Mark attendance manually or import from a spreadsheet."
          emptyAction={
            can('attendance:create') && (
              <Button
                icon={<ClockUser size={16} weight="fill" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Mark attendance
              </Button>
            )
          }
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <AttendanceFormModal
        open={formOpen}
        record={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => list.refetch()}
      />
      <AttendanceImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => list.refetch()} />
    </div>
  );
}
