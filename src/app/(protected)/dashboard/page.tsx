'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UsersThree, UserCheck, UserMinus, Buildings, Plus, Money } from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useAuth } from '@/store/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/modules/StatCard';
import { Button, Card, CardHeader, CardBody, LoadingState, EmptyState } from '@/components/ui';

type DashboardData = {
  employees: { total: number; active: number; onNotice: number; exited: number };
  departments: number;
  monthlyPayrollCost: number;
  pendingApprovals: number;
  upcomingDeadlines: { label: string; date: string }[];
};

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const can = useAuth((s) => s.can);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardData>('/dashboard')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? ''}`}
        description="Here's what's happening across your organization."
        actions={
          can('employees:create') && (
            <Button icon={<Plus size={16} weight="bold" />} onClick={() => router.push('/employees?new=1')}>
              Add Employee
            </Button>
          )
        }
      />

      {loading ? (
        <LoadingState />
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Employees" value={data.employees.total} icon={UsersThree} tone="brand" />
            <StatCard label="Active" value={data.employees.active} icon={UserCheck} tone="success" />
            <StatCard label="On Notice" value={data.employees.onNotice} icon={UserMinus} tone="warning" />
            <StatCard label="Departments" value={data.departments} icon={Buildings} tone="info" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Payroll cost trend" description="Available once the payroll engine is live (Phase 2)" />
              <CardBody>
                <EmptyState
                  icon={<Money size={24} />}
                  title="No payroll runs yet"
                  description="Run your first monthly payroll to see cost trends here."
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Compliance deadlines" />
              <CardBody>
                {data.upcomingDeadlines.length === 0 ? (
                  <EmptyState title="All clear" description="No upcoming statutory deadlines." />
                ) : (
                  <ul className="space-y-2">
                    {data.upcomingDeadlines.map((d) => (
                      <li key={d.label} className="flex justify-between text-sm">
                        <span className="text-fg">{d.label}</span>
                        <span className="text-muted">{d.date}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>

          <p className="text-center text-xs text-muted">
            Monthly payroll cost &amp; pending approvals populate as Phase 2 modules come online.
            {' '}Current estimate: {inr.format(data.monthlyPayrollCost)}.
          </p>
        </div>
      ) : (
        <EmptyState title="Couldn't load the dashboard" description="Please refresh the page." />
      )}
    </div>
  );
}
