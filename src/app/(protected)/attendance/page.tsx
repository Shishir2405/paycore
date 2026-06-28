'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs } from '@/components/ui';
import { AttendanceTab } from '@/components/modules/attendance/AttendanceTab';
import { ShiftsTab } from '@/components/modules/attendance/ShiftsTab';
import { HolidaysTab } from '@/components/modules/attendance/HolidaysTab';

const TABS = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'shifts', label: 'Shifts' },
  { key: 'holidays', label: 'Holidays' },
];

export default function AttendancePage() {
  const [tab, setTab] = useState('attendance');

  return (
    <div>
      <PageHeader
        title="Time & Attendance"
        description="Track daily attendance, define shifts, and manage the holiday calendar."
      />

      <div className="space-y-4">
        <Tabs items={TABS} value={tab} onChange={setTab} />

        {tab === 'attendance' && <AttendanceTab />}
        {tab === 'shifts' && <ShiftsTab />}
        {tab === 'holidays' && <HolidaysTab />}
      </div>
    </div>
  );
}
