'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, type TabItem } from '@/components/ui';
import { ComplianceCalendar } from '@/components/modules/compliance/ComplianceCalendar';
import { PtSlabsTab } from '@/components/modules/compliance/PtSlabsTab';
import { LwfRulesTab } from '@/components/modules/compliance/LwfRulesTab';
import { StatutoryCalculator } from '@/components/modules/compliance/StatutoryCalculator';

const TABS: TabItem[] = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'pt-slabs', label: 'PT Slabs' },
  { key: 'lwf-rules', label: 'LWF Rules' },
  { key: 'calculator', label: 'Calculator' },
];

export default function CompliancePage() {
  const [tab, setTab] = useState('calendar');

  return (
    <div>
      <PageHeader
        title="Statutory Compliance"
        description="PF, ESI, PT and LWF — calendar, configuration, and calculator."
      />

      <Tabs items={TABS} value={tab} onChange={setTab} className="mb-4" />

      {tab === 'calendar' && <ComplianceCalendar />}
      {tab === 'pt-slabs' && <PtSlabsTab />}
      {tab === 'lwf-rules' && <LwfRulesTab />}
      {tab === 'calculator' && <StatutoryCalculator />}
    </div>
  );
}
