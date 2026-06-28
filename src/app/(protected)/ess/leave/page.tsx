'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Clock, CheckCircle } from '@phosphor-icons/react';
import { essApi, type EssSummary } from '@/lib/api/ess';
import { ApiError } from '@/lib/api/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { EssNav } from '@/components/modules/ess/EssNav';
import { LeaveBalanceCard } from '@/components/modules/ess/LeaveBalanceCard';
import { Button, Card, CardHeader, CardBody, LoadingState, EmptyState, Badge } from '@/components/ui';

function LeaveView() {
  const router = useRouter();
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

  return (
    <div>
      <PageHeader
        title="Leave"
        description="Your leave balances and requests."
        actions={
          <Button icon={<CalendarPlus size={16} weight="bold" />} onClick={() => router.push('/leave')}>
            Apply for leave
          </Button>
        }
      />

      <EssNav />

      {loading ? (
        <LoadingState />
      ) : error || !summary ? (
        <EmptyState title="Couldn't load your leave" description={error ?? 'Please refresh the page.'} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <Clock size={18} weight="fill" />
              </span>
              <div>
                <p className="text-lg font-semibold text-fg">{summary.leave.pendingRequests}</p>
                <p className="text-xs text-muted">Pending requests</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
                <CheckCircle size={18} weight="fill" />
              </span>
              <div>
                <p className="text-lg font-semibold text-fg">{summary.leave.approvedThisYear}</p>
                <p className="text-xs text-muted">Approved this year</p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader
              title="Leave balances"
              action={
                summary.leave.pendingRequests > 0 ? (
                  <Badge tone="warning">{summary.leave.pendingRequests} pending</Badge>
                ) : null
              }
            />
            <CardBody>
              {summary.leave.balances.length === 0 ? (
                <EmptyState
                  icon={<CalendarPlus size={22} />}
                  title="No leave balances yet"
                  description="Your leave entitlements will show here once allocated by HR."
                  action={
                    <Button variant="outline" size="sm" onClick={() => router.push('/leave')}>
                      Apply for leave
                    </Button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {summary.leave.balances.map((b) => (
                    <LeaveBalanceCard key={b.leaveTypeId} balance={b} />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function EssLeavePage() {
  return (
    <RequirePermission permission="ess:view">
      <LeaveView />
    </RequirePermission>
  );
}
