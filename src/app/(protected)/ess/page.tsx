'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarBlank,
  Clock,
  UserCircle,
  FileText,
  Lifebuoy,
  CaretRight,
  ArrowRight,
} from '@phosphor-icons/react';
import { essApi, type EssSummary } from '@/lib/api/ess';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/store/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { StatCard } from '@/components/modules/StatCard';
import { EssNav } from '@/components/modules/ess/EssNav';
import { LeaveBalanceCard } from '@/components/modules/ess/LeaveBalanceCard';
import { Card, CardHeader, CardBody, LoadingState, EmptyState } from '@/components/ui';

const QUICK_LINKS = [
  { href: '/ess/profile', label: 'My profile', hint: 'View & request changes', icon: UserCircle },
  { href: '/ess/leave', label: 'Leave', hint: 'Balances & apply', icon: CalendarBlank },
  { href: '/ess/payslips', label: 'Payslips', hint: 'Download payslips', icon: FileText },
  { href: '/ess/helpdesk', label: 'Helpdesk', hint: 'Raise a query', icon: Lifebuoy },
] as const;

function EssOverview() {
  const user = useAuth((s) => s.user);
  const [summary, setSummary] = useState<EssSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    essApi
      .summary()
      .then((s) => active && setSummary(s))
      .catch((err) => active && setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const firstName = summary?.profile.firstName ?? user?.name?.split(' ')[0] ?? 'there';

  return (
    <div>
      <PageHeader
        title={`Hi, ${firstName}`}
        description="Your personal self-service portal — leave, payslips, profile, and support."
      />

      <EssNav />

      {loading ? (
        <LoadingState />
      ) : error || !summary ? (
        <EmptyState title="Couldn't load your portal" description={error ?? 'Please refresh the page.'} />
      ) : (
        <div className="space-y-6">
          {/* Headline stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Leave balance"
              value={summary.leave.balances.reduce((sum, b) => sum + b.balance, 0)}
              icon={CalendarBlank}
              tone="brand"
              hint="Days remaining across all types"
            />
            <StatCard
              label="Pending leave"
              value={summary.leave.pendingRequests}
              icon={Clock}
              tone="warning"
              hint="Awaiting approval"
            />
            <StatCard
              label="Open tickets"
              value={summary.helpdesk.open}
              icon={Lifebuoy}
              tone="info"
              hint={`${summary.helpdesk.total} total raised`}
            />
            <StatCard
              label="Profile requests"
              value={summary.pendingProfileRequests}
              icon={UserCircle}
              tone="success"
              hint="Pending HR approval"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Leave balances */}
            <Card className="lg:col-span-2">
              <CardHeader
                title="Leave balances"
                action={
                  <Link
                    href="/ess/leave"
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                  >
                    View all <ArrowRight size={13} weight="bold" />
                  </Link>
                }
              />
              <CardBody>
                {summary.leave.balances.length === 0 ? (
                  <EmptyState
                    icon={<CalendarBlank size={22} />}
                    title="No leave balances yet"
                    description="Your leave entitlements will appear here once allocated."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {summary.leave.balances.map((b) => (
                      <LeaveBalanceCard key={b.leaveTypeId} balance={b} />
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Payslip + quick links */}
            <div className="space-y-6">
              <Card>
                <CardHeader title="Latest payslip" />
                <CardBody>
                  <Link
                    href="/ess/payslips"
                    className="flex items-center justify-between rounded-md border border-border bg-surface-2/40 px-3 py-3 transition-colors hover:bg-surface-2"
                  >
                    <span className="inline-flex items-center gap-2 text-sm text-fg">
                      <FileText size={18} className="text-brand" />
                      View my payslips
                    </span>
                    <CaretRight size={15} className="text-muted" />
                  </Link>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Quick links */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-fg">Quick links</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-card transition-colors hover:border-brand/40"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-subtle text-brand">
                      <Icon size={18} weight="fill" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-fg">{link.label}</span>
                      <span className="block text-xs text-muted">{link.hint}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function EssPage() {
  return (
    <RequirePermission permission="ess:view">
      <EssOverview />
    </RequirePermission>
  );
}
