/**
 * India income-tax computation for FY 2024-25 (AY 2025-26) under both the Old
 * and New regimes, plus a helper that recommends the cheaper regime for a given
 * gross income and total deductions.
 *
 * Notes on the slabs encoded here:
 *  - New regime: standard deduction ₹75,000; rebate u/s 87A makes tax NIL when
 *    taxable income ≤ ₹7,00,000. Slabs: 0 up to 3L, 5% 3–7L, 10% 7–10L,
 *    15% 10–12L, 20% 12–15L, 30% above 15L.
 *  - Old regime: standard deduction ₹50,000; rebate u/s 87A makes tax NIL when
 *    taxable income ≤ ₹5,00,000. Slabs: 0 up to 2.5L, 5% 2.5–5L, 20% 5–10L,
 *    30% above 10L.
 *  - Health & Education cess of 4% applies to tax after rebate in both regimes.
 *
 * All deductions other than the standard deduction (Chapter VI-A: 80C, 80D…)
 * apply only under the Old regime; the New regime ignores them by design.
 */

export type RegimeBreakdown = {
  /** Income after the regime's standard deduction (and Old-regime deductions). */
  taxableIncome: number;
  /** Tax on slabs before rebate. */
  taxBeforeRebate: number;
  /** Rebate u/s 87A applied (0 when income exceeds the threshold). */
  rebate: number;
  /** 4% health & education cess on (tax − rebate). */
  cess: number;
  /** Final payable = max(0, tax − rebate) + cess. */
  totalTax: number;
};

type Slab = { upTo: number; rate: number };

const NEW_REGIME_SLABS: Slab[] = [
  { upTo: 300_000, rate: 0 },
  { upTo: 700_000, rate: 0.05 },
  { upTo: 1_000_000, rate: 0.1 },
  { upTo: 1_200_000, rate: 0.15 },
  { upTo: 1_500_000, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
];

const OLD_REGIME_SLABS: Slab[] = [
  { upTo: 250_000, rate: 0 },
  { upTo: 500_000, rate: 0.05 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
];

const CESS_RATE = 0.04;
export const NEW_REGIME_STD_DEDUCTION = 75_000;
export const OLD_REGIME_STD_DEDUCTION = 50_000;
const NEW_REGIME_87A_LIMIT = 700_000;
const OLD_REGIME_87A_LIMIT = 500_000;

/** Progressive slab tax on a (already taxable) income. */
function slabTax(taxableIncome: number, slabs: Slab[]): number {
  const income = Math.max(0, Math.round(taxableIncome));
  let tax = 0;
  let lower = 0;
  for (const slab of slabs) {
    if (income <= lower) break;
    const bandTop = Math.min(income, slab.upTo);
    tax += (bandTop - lower) * slab.rate;
    lower = slab.upTo;
  }
  return Math.round(tax);
}

function compute(
  taxableIncome: number,
  slabs: Slab[],
  rebateLimit: number,
): RegimeBreakdown {
  const safeIncome = Math.max(0, Math.round(taxableIncome));
  const taxBeforeRebate = slabTax(safeIncome, slabs);
  // 87A: full rebate of the computed tax when income is within the limit.
  const rebate = safeIncome <= rebateLimit ? taxBeforeRebate : 0;
  const taxAfterRebate = Math.max(0, taxBeforeRebate - rebate);
  const cess = Math.round(taxAfterRebate * CESS_RATE);
  return {
    taxableIncome: safeIncome,
    taxBeforeRebate,
    rebate,
    cess,
    totalTax: taxAfterRebate + cess,
  };
}

/**
 * New-regime tax. `taxableIncome` here is income BEFORE the standard deduction —
 * the standard deduction is applied internally so callers pass a consistent base.
 */
export function computeTaxNewRegime(taxableIncome: number): RegimeBreakdown {
  const net = Math.max(0, Math.round(taxableIncome) - NEW_REGIME_STD_DEDUCTION);
  return compute(net, NEW_REGIME_SLABS, NEW_REGIME_87A_LIMIT);
}

/**
 * Old-regime tax. `taxableIncome` is income BEFORE the standard deduction; pass
 * income already net of Chapter VI-A deductions (80C/80D…) — only the standard
 * deduction is applied here.
 */
export function computeTaxOldRegime(taxableIncome: number): RegimeBreakdown {
  const net = Math.max(0, Math.round(taxableIncome) - OLD_REGIME_STD_DEDUCTION);
  return compute(net, OLD_REGIME_SLABS, OLD_REGIME_87A_LIMIT);
}

export type RegimeRecommendation = {
  old: RegimeBreakdown;
  new: RegimeBreakdown;
  /** Cheaper regime; ties favour 'New' (simpler compliance). */
  recommended: 'Old' | 'New';
  /** Absolute tax saved by choosing the recommended regime. */
  savings: number;
};

/**
 * Compare regimes for a gross annual income and a total of Chapter VI-A style
 * deductions. Deductions reduce the Old-regime base only; the New regime ignores
 * them (its lower slabs are the trade-off).
 */
export function recommendRegime(grossIncome: number, deductions: number): RegimeRecommendation {
  const gross = Math.max(0, Math.round(grossIncome));
  const ded = Math.max(0, Math.round(deductions));

  const oldBreakdown = computeTaxOldRegime(Math.max(0, gross - ded));
  const newBreakdown = computeTaxNewRegime(gross);

  const recommended = oldBreakdown.totalTax < newBreakdown.totalTax ? 'Old' : 'New';
  const savings = Math.abs(oldBreakdown.totalTax - newBreakdown.totalTax);

  return { old: oldBreakdown, new: newBreakdown, recommended, savings };
}
