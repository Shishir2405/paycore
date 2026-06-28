'use client';

import { Gear, EnvelopeSimple, UsersThree, ShieldCheck } from '@phosphor-icons/react';
import { useAuth } from '@/store/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, Badge } from '@/components/ui';

const SECTIONS = [
  { icon: EnvelopeSimple, title: 'Email & SMS', desc: 'Toggle Gmail/Brevo provider at runtime, edit templates.' },
  { icon: UsersThree, title: 'Users & Roles', desc: 'Granular RBAC — permissions per module and action.' },
  { icon: ShieldCheck, title: 'Approval Workflows', desc: 'Configurable approval chains for leave, payroll, reimbursements.' },
  { icon: Gear, title: 'Company Setup', desc: 'Multi-location, statutory IDs, pay calendar, signatories.' },
];

export default function SettingsPage() {
  const user = useAuth((s) => s.user);

  return (
    <div>
      <PageHeader title="Settings" description="Configure your PayCore workspace." />

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-fg">Signed in as {user?.name}</p>
            <p className="text-sm text-muted">{user?.email}</p>
          </div>
          <Badge tone="brand">{user?.role}</Badge>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title}>
              <CardBody className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
                  <Icon size={18} weight="fill" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-fg">{s.title}</p>
                    <Badge tone="neutral">Phase 2+</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{s.desc}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
