import { cn } from '@/lib/utils/cn';
import type { EssLeaveBalance } from '@/lib/api/ess';

/** A single leave-type balance with a used/entitled progress bar. */
export function LeaveBalanceCard({ balance }: { balance: EssLeaveBalance }) {
  const { entitled, used, balance: remaining, leaveTypeName } = balance;
  const pct = entitled > 0 ? Math.min(100, Math.round((used / entitled) * 100)) : 0;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-medium text-fg">{leaveTypeName}</p>
        <p className="shrink-0 text-sm font-semibold text-fg">
          {remaining}
          <span className="text-xs font-normal text-muted"> left</span>
        </p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn('h-full rounded-full', pct >= 100 ? 'bg-danger' : pct >= 75 ? 'bg-warning' : 'bg-brand')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {used} used of {entitled} entitled
      </p>
    </div>
  );
}
