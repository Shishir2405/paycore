'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, type TabItem } from '@/components/ui';
import { JournalTab } from '@/components/modules/finance/JournalTab';
import { CostCentersTab } from '@/components/modules/finance/CostCentersTab';
import { BankFilesTab } from '@/components/modules/finance/BankFilesTab';

const TABS: TabItem[] = [
  { key: 'journal', label: 'Journal' },
  { key: 'cost-centers', label: 'Cost Centers' },
  { key: 'bank-files', label: 'Bank Files' },
];

export default function FinancePage() {
  const [tab, setTab] = useState('journal');

  return (
    <div>
      <PageHeader
        title="Finance & Integration"
        description="Journal vouchers, cost centers, Tally export, and bank disbursement files."
      />

      <Tabs items={TABS} value={tab} onChange={setTab} className="mb-4" />

      {tab === 'journal' && <JournalTab />}
      {tab === 'cost-centers' && <CostCentersTab />}
      {tab === 'bank-files' && <BankFilesTab />}
    </div>
  );
}
