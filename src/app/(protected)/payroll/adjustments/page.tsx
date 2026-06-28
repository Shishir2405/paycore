'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from '@phosphor-icons/react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, type TabItem } from '@/components/ui';
import { ArrearsTab } from '@/components/modules/payroll/ArrearsTab';
import { BonusesTab } from '@/components/modules/payroll/BonusesTab';
import { FinalSettlementsTab } from '@/components/modules/payroll/FinalSettlementsTab';

const TABS: TabItem[] = [
  { key: 'arrears', label: 'Arrears' },
  { key: 'bonuses', label: 'Bonuses' },
  { key: 'settlements', label: 'Final Settlements' },
];

export default function PayrollAdjustmentsPage() {
  const router = useRouter();
  const [tab, setTab] = useState('arrears');

  return (
    <div>
      <button
        onClick={() => router.push('/payroll')}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft size={15} /> Back to payroll
      </button>

      <PageHeader
        title="Payroll Adjustments"
        description="Arrears, bonuses, and full-and-final settlements folded into payroll cycles."
      />

      <Tabs items={TABS} value={tab} onChange={setTab} className="mb-4" />

      {tab === 'arrears' && <ArrearsTab />}
      {tab === 'bonuses' && <BonusesTab />}
      {tab === 'settlements' && <FinalSettlementsTab />}
    </div>
  );
}
