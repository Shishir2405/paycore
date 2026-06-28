'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, type TabItem } from '@/components/ui';
import { LeaveRequestsTab } from '@/components/modules/leave/LeaveRequestsTab';
import { LeaveTypesTab } from '@/components/modules/leave/LeaveTypesTab';
import { LeaveBalancesTab } from '@/components/modules/leave/LeaveBalancesTab';

const TABS: TabItem[] = [
  { key: 'requests', label: 'Requests' },
  { key: 'types', label: 'Types' },
  { key: 'balances', label: 'Balances' },
];

export default function LeavePage() {
  const [tab, setTab] = useState('requests');

  return (
    <div>
      <PageHeader title="Leave" description="Track requests, configure policies, and monitor balances." />

      <div className="space-y-4">
        <Tabs items={TABS} value={tab} onChange={setTab} />

        {tab === 'requests' && <LeaveRequestsTab />}
        {tab === 'types' && <LeaveTypesTab />}
        {tab === 'balances' && <LeaveBalancesTab />}
      </div>
    </div>
  );
}
