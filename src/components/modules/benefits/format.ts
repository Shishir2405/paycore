/** Shared formatting helpers for the Benefits & Deductions UI. */

/** Format an INR amount with the ₹ symbol and Indian digit grouping. */
export function inr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/** Map a workflow status to a Badge tone. */
export const STATUS_TONE: Record<string, 'success' | 'neutral' | 'warning' | 'danger'> = {
  Active: 'success',
  Approved: 'success',
  Closed: 'neutral',
  Pending: 'warning',
  Rejected: 'danger',
};
