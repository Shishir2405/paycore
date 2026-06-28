/** A compact label/value row for read-only profile detail blocks. */
export function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="text-sm text-fg sm:text-right">{value ?? '—'}</dd>
    </div>
  );
}
