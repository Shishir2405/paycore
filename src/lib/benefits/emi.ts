/**
 * Loan amortization helpers — reducing-balance (diminishing) method, the standard
 * for Indian salary-advance and staff loans. `computeEmi` derives the level EMI
 * from principal, annual rate, and tenure; `generateEmiSchedule` expands the full
 * month-by-month split of principal vs. interest with a running balance.
 *
 * All money values are plain numbers (INR) rounded to 2dp. A zero interest rate is
 * handled as a straight-line split so the schedule never divides by zero.
 */

export type EmiScheduleRow = {
  /** 1-based month position within the loan tenure. */
  monthIndex: number;
  emi: number;
  principalPart: number;
  interestPart: number;
  /** Outstanding principal after this installment. */
  balance: number;
};

/** Round to 2 decimal places, avoiding binary float drift. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Level EMI for a reducing-balance loan.
 *   EMI = P·r·(1+r)^n / ((1+r)^n − 1),  r = monthly rate, n = months.
 * Returns 0 for non-positive inputs so callers can guard cleanly.
 */
export function computeEmi(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12 / 100;
  if (r === 0) return round2(principal / months);
  const pow = Math.pow(1 + r, months);
  return round2((principal * r * pow) / (pow - 1));
}

/**
 * Full reducing-balance amortization schedule. The final installment absorbs any
 * rounding remainder so the closing balance lands exactly on zero.
 */
export function generateEmiSchedule(
  principal: number,
  annualRate: number,
  months: number,
): EmiScheduleRow[] {
  if (principal <= 0 || months <= 0) return [];

  const r = annualRate / 12 / 100;
  const emi = computeEmi(principal, annualRate, months);
  const rows: EmiScheduleRow[] = [];
  let balance = principal;

  for (let i = 1; i <= months; i += 1) {
    const interestPart = round2(balance * r);
    let principalPart = round2(emi - interestPart);
    let installment = emi;

    // Last row: settle the entire remaining balance, regardless of rounding.
    if (i === months) {
      principalPart = round2(balance);
      installment = round2(principalPart + interestPart);
    }

    balance = round2(balance - principalPart);
    if (balance < 0) balance = 0;

    rows.push({
      monthIndex: i,
      emi: installment,
      principalPart,
      interestPart,
      balance,
    });
  }

  return rows;
}

/** Total interest payable across the life of the loan. */
export function totalInterest(principal: number, annualRate: number, months: number): number {
  return round2(
    generateEmiSchedule(principal, annualRate, months).reduce((sum, row) => sum + row.interestPart, 0),
  );
}
