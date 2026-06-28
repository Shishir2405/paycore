/**
 * Labour Welfare Fund (LWF) calculator — India. LWF is a state levy, usually
 * deducted half-yearly (June & December in many states) at a small fixed
 * employee amount with a matching/multiple employer amount. Rules vary by state
 * so the caller supplies them; deduction only happens in the configured months.
 */
export type LwfFrequency = 'Monthly' | 'HalfYearly' | 'Annual';

export type LwfRuleInput = {
  stateCode: string;
  employeeAmount: number;
  employerAmount: number;
  frequency?: LwfFrequency;
  /** Calendar months (1-12) in which LWF is deducted, e.g. [6, 12]. */
  deductionMonths?: number[];
};

export type LwfResult = {
  stateCode: string;
  applicable: boolean;
  employee: number;
  employer: number;
  total: number;
  frequency: LwfFrequency;
};

const NOT_APPLICABLE = (stateCode: string, frequency: LwfFrequency): LwfResult => ({
  stateCode,
  applicable: false,
  employee: 0,
  employer: 0,
  total: 0,
  frequency,
});

/**
 * @param stateCode GST/state code the rule belongs to.
 * @param rules     Configured rule for the state (undefined => not applicable).
 * @param month     1-12; when provided, LWF only applies in `deductionMonths`.
 */
export function computeLwf(
  stateCode: string,
  rules?: LwfRuleInput | null,
  month?: number,
): LwfResult {
  const frequency = rules?.frequency ?? 'HalfYearly';
  if (!rules) return NOT_APPLICABLE(stateCode, frequency);

  const months = rules.deductionMonths ?? [6, 12];
  // If a month is given, only deduct in the configured deduction months.
  if (month !== undefined && months.length > 0 && !months.includes(month)) {
    return NOT_APPLICABLE(rules.stateCode, frequency);
  }

  const employee = Math.max(0, rules.employeeAmount || 0);
  const employer = Math.max(0, rules.employerAmount || 0);

  return {
    stateCode: rules.stateCode,
    applicable: employee + employer > 0,
    employee,
    employer,
    total: employee + employer,
    frequency,
  };
}
