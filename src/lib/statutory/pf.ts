/**
 * Provident Fund (EPF) calculator — India.
 *
 * Statutory split on PF wages (Basic + DA):
 *   - Employee contribution: 12% of PF wage.
 *   - Employer contribution: 12% of PF wage, itself split into
 *       - EPS (pension): 8.33% of min(PF wage, ceiling) — capped at the ceiling.
 *       - EPF (provident): the remainder so EPS + EPF = employer 12%.
 *
 * The statutory wage ceiling is ₹15,000 (configurable). Above the ceiling,
 * EPS is always computed on the ceiling; whether the 12% itself is capped at
 * the ceiling depends on company policy, so `capContribution` controls that.
 */
export const PF_WAGE_CEILING = 15000;
export const PF_EMPLOYEE_RATE = 0.12;
export const PF_EMPLOYER_RATE = 0.12;
export const EPS_RATE = 0.0833;

export type PfOptions = {
  /** Statutory PF wage ceiling. Defaults to ₹15,000. */
  ceiling?: number;
  /**
   * When true, the 12% employee/employer contributions are computed on
   * min(wage, ceiling) instead of the full wage. EPS is always on the ceiling.
   */
  capContribution?: boolean;
};

export type PfResult = {
  /** PF wage used (Basic + DA). */
  pfWage: number;
  /** Wage actually used for the 12% contributions (post-cap). */
  contributionBase: number;
  employee: number;
  employer: number;
  employerEps: number;
  employerEpf: number;
  /** Employee + total employer (EPS + EPF). */
  total: number;
};

const round = (n: number) => Math.round(n);

/**
 * @param basicPlusDa Monthly PF wage = Basic + Dearness Allowance.
 */
export function computePf(basicPlusDa: number, options: PfOptions = {}): PfResult {
  const ceiling = options.ceiling ?? PF_WAGE_CEILING;
  const pfWage = Math.max(0, basicPlusDa || 0);

  const contributionBase = options.capContribution ? Math.min(pfWage, ceiling) : pfWage;

  const employee = round(contributionBase * PF_EMPLOYEE_RATE);
  const employer = round(contributionBase * PF_EMPLOYER_RATE);

  const epsBase = Math.min(pfWage, ceiling);
  const employerEps = round(epsBase * EPS_RATE);
  // EPF is the remainder so the employer split always sums to the 12%.
  const employerEpf = Math.max(0, employer - employerEps);

  return {
    pfWage,
    contributionBase,
    employee,
    employer,
    employerEps,
    employerEpf,
    total: employee + employer,
  };
}
