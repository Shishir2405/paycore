'use client';

import { DownloadSimple, CaretDown } from '@phosphor-icons/react';
import { Dropdown, DropdownItem } from '@/components/ui';
import { payslipsApi, type ReportKind, type ReportFormat } from '@/lib/api/payslips';

const FORMATS: { label: string; value: ReportFormat }[] = [
  { label: 'CSV', value: 'csv' },
  { label: 'Excel (XLSX)', value: 'xlsx' },
  { label: 'PDF', value: 'pdf' },
  { label: 'JSON', value: 'json' },
];

/** A labelled report button that opens a format menu and downloads on pick. */
export function ReportExportMenu({ label, kind, runId }: { label: string; kind: ReportKind; runId: string }) {
  return (
    <Dropdown
      trigger={
        <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2">
          <DownloadSimple size={15} />
          {label}
          <CaretDown size={13} weight="bold" className="text-muted" />
        </button>
      }
    >
      {FORMATS.map((f) => (
        <DropdownItem key={f.value} onClick={() => window.open(payslipsApi.reportUrl(kind, runId, f.value), '_blank')}>
          {f.label}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}
