'use client';

import { useState } from 'react';
import { Plus, DotsThreeVertical, PencilSimple, Trash, HandCoins } from '@phosphor-icons/react';
import { useList } from '@/hooks/useList';
import { useAuth } from '@/store/auth';
import { complianceApi, type LwfRule } from '@/lib/api/compliance';
import { ApiError } from '@/lib/api/client';
import { LwfRuleFormModal } from './LwfRuleFormModal';
import {
  Badge,
  Button,
  Dropdown,
  DropdownItem,
  FilterBar,
  Pagination,
  Table,
  type TableColumn,
  useToast,
} from '@/components/ui';

const inr = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function LwfRulesTab() {
  const toast = useToast();
  const can = useAuth((s) => s.can);

  const list = useList<LwfRule>('/compliance/lwf-rules', { initialSortBy: 'stateCode', initialSortDir: 'asc' });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LwfRule | null>(null);

  async function handleDelete(rule: LwfRule) {
    if (!confirm(`Delete LWF rule for ${rule.stateCode}?`)) return;
    try {
      await complianceApi.removeLwfRule(rule.id);
      toast.success('Rule deleted');
      list.refetch();
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : undefined);
    }
  }

  const columns: TableColumn<LwfRule>[] = [
    { key: 'stateCode', header: 'State', width: 'w-20', render: (r) => <span className="font-medium text-fg">{r.stateCode}</span> },
    { key: 'employeeAmount', header: 'Employee (₹)', align: 'right', render: (r) => inr(r.employeeAmount) },
    { key: 'employerAmount', header: 'Employer (₹)', align: 'right', render: (r) => inr(r.employerAmount) },
    { key: 'frequency', header: 'Frequency', render: (r) => <span className="text-fg-subtle">{r.frequency}</span> },
    {
      key: 'deductionMonths',
      header: 'Months',
      render: (r) => (r.deductionMonths.length ? r.deductionMonths.map((m) => MONTHS[m]).join(', ') : '—'),
    },
    {
      key: 'isActive',
      header: 'Active',
      render: (r) => <Badge tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-12',
      render: (r) =>
        can('compliance:edit') && (
          <Dropdown
            trigger={
              <button className="rounded p-1 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Row actions">
                <DotsThreeVertical size={18} weight="bold" />
              </button>
            }
          >
            <DropdownItem
              icon={<PencilSimple size={16} />}
              onClick={() => {
                setEditing(r);
                setFormOpen(true);
              }}
            >
              Edit
            </DropdownItem>
            <DropdownItem icon={<Trash size={16} />} danger onClick={() => handleDelete(r)}>
              Delete
            </DropdownItem>
          </Dropdown>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <FilterBar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search by state code…"
        actions={
          can('compliance:create') && (
            <Button
              icon={<Plus size={16} weight="bold" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add Rule
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
          rowKey={(r) => r.id}
          loading={list.loading}
          sortBy={list.sortBy}
          sortDir={list.sortDir}
          onSort={list.toggleSort}
          emptyTitle="No LWF rules configured"
          emptyDescription="Add per-state Labour Welfare Fund rules with their deduction months."
          emptyAction={
            can('compliance:create') && (
              <Button
                icon={<HandCoins size={16} weight="fill" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Add Rule
              </Button>
            )
          }
        />
      )}

      {list.meta && list.meta.total > 0 && <Pagination meta={list.meta} onPageChange={list.setPage} />}

      <LwfRuleFormModal
        open={formOpen}
        rule={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => list.refetch()}
      />
    </div>
  );
}
