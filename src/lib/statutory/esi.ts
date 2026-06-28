/**
 * Employees' State Insurance (ESI) calculator — India.
 *
 * Applicability: gross wage at or below the wage threshold (₹21,000/month).
 * Once an employee crosses the threshold mid-contribution-period they continue
 * to contribute until period end, but that lifecycle is handled by payroll;
 * this pure function only answers "given this gross, what is due".
 *
 * Rates: employee 0.75%, employer 3.25%. Contributions are rounded UP to the
 * next rupee per ESIC rules.
 */
export const ESI_WAGE_THRESHOLD = 21000;
export const ESI_EMPLOYEE_RATE = 0.0075;
export const ESI_EMPLOYER_RATE = 0.0325;

export type EsiOptions = {
  /** ESI wage threshold for applicability. Defaults to ₹21,000. */
  threshold?: number;
};

export type EsiResult = {
  applicable: boolean;
  grossWage: number;
  employee: number;
  employer: number;
  total: number;
};

/** ESIC rounds contributions up to the next rupee. */
const roundUp = (n: number) => Math.ceil(n);

export function computeEsi(grossWage: number, options: EsiOptions = {}): EsiResult {
  const threshold = options.threshold ?? ESI_WAGE_THRESHOLD;
  const gross = Math.max(0, grossWage || 0);
  const applicable = gross > 0 && gross <= threshold;

  if (!applicable) {
    return { applicable: false, grossWage: gross, employee: 0, employer: 0, total: 0 };
  }

  const employee = roundUp(gross * ESI_EMPLOYEE_RATE);
  const employer = roundUp(gross * ESI_EMPLOYER_RATE);

  return { applicable: true, grossWage: gross, employee, employer, total: employee + employer };
}
