/**
 * Professional Tax (PT) calculator — India. PT is levied by individual states,
 * each with its own monthly slab table, so the caller supplies the slab rows
 * for the relevant state. When no slabs are configured we fall back to the
 * Maharashtra default (the most common reference table).
 */
export type PtFrequency = 'Monthly' | 'Annual';

export type PtSlabRow = {
  stateCode: string;
  /** Inclusive lower bound of monthly gross for this slab. */
  fromAmount: number;
  /** Inclusive upper bound; null/undefined means "and above". */
  toAmount?: number | null;
  /** PT amount for the slab (monthly unless `frequency` says otherwise). */
  amount: number;
  frequency?: PtFrequency;
  /** Optional month override for special slabs (e.g. MH February ₹300). */
  month?: number;
};

export type PtResult = {
  stateCode: string;
  monthlyGross: number;
  amount: number;
  /** True when no matching state slabs were supplied and the default was used. */
  usedDefault: boolean;
};

/**
 * Maharashtra default monthly slabs (post-2023 reference). Males/females are
 * not differentiated here for simplicity; companies override via PTSlab rows.
 * The ₹300 February top-up is modelled as a month-specific slab.
 */
export const MAHARASHTRA_DEFAULT_SLABS: PtSlabRow[] = [
  { stateCode: 'MH', fromAmount: 0, toAmount: 7500, amount: 0, frequency: 'Monthly' },
  { stateCode: 'MH', fromAmount: 7501, toAmount: 10000, amount: 175, frequency: 'Monthly' },
  { stateCode: 'MH', fromAmount: 10001, toAmount: null, amount: 200, frequency: 'Monthly' },
  // February top-up: ₹300 for the highest slab (200 + 100 adjustment).
  { stateCode: 'MH', fromAmount: 10001, toAmount: null, amount: 300, frequency: 'Monthly', month: 2 },
];

/**
 * @param monthlyGross  Monthly gross used to locate the slab.
 * @param stateCode     GST state code (e.g. "27"/"MH"); used only to pick default.
 * @param slabs         Configured slab rows; empty => Maharashtra default.
 * @param month         1-12, used to honour month-specific slabs (e.g. MH Feb).
 */
export function computePt(
  monthlyGross: number,
  stateCode: string,
  slabs: PtSlabRow[] = [],
  month?: number,
): PtResult {
  const gross = Math.max(0, monthlyGross || 0);
  const usedDefault = slabs.length === 0;
  const table = usedDefault ? MAHARASHTRA_DEFAULT_SLABS : slabs;
  const effectiveState = usedDefault ? 'MH' : stateCode;

  const candidates = table.filter((s) => {
    const lo = s.fromAmount ?? 0;
    const hi = s.toAmount ?? Number.POSITIVE_INFINITY;
    const monthOk = s.month === undefined || s.month === month;
    return gross >= lo && gross <= hi && monthOk;
  });

  // Prefer a month-specific match (e.g. February) over the generic slab.
  const match =
    candidates.find((s) => s.month !== undefined) ?? candidates.find((s) => s.month === undefined);

  return {
    stateCode: effectiveState,
    monthlyGross: gross,
    amount: match ? Math.max(0, match.amount) : 0,
    usedDefault,
  };
}
