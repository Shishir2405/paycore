/** Small display helpers shared across the payroll & payslip pages. */

/** Shared INR currency formatter (no paise) for tables and summary cards. */
export const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Format a number as INR with grouping, up to 2 decimals. */
export function inr(amount: number | undefined | null): string {
  const n = amount ?? 0;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Short date (en-IN). */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const MONTH_OPTIONS = [
  { label: 'January', value: '1' },
  { label: 'February', value: '2' },
  { label: 'March', value: '3' },
  { label: 'April', value: '4' },
  { label: 'May', value: '5' },
  { label: 'June', value: '6' },
  { label: 'July', value: '7' },
  { label: 'August', value: '8' },
  { label: 'September', value: '9' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
];

const STATUS_TONES: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'brand'> = {
  Draft: 'neutral',
  Calculated: 'info',
  Approved: 'warning',
  Locked: 'success',
};

/** Badge tone for a payroll run status. */
export function runStatusTone(status: string): 'neutral' | 'info' | 'warning' | 'success' | 'brand' {
  return STATUS_TONES[status] ?? 'neutral';
}
