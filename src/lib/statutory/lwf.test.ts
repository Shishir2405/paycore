import { describe, it, expect } from 'vitest';
import { computeLwf, type LwfRuleInput } from './lwf';

const rule: LwfRuleInput = {
  stateCode: 'MH',
  employeeAmount: 25,
  employerAmount: 75,
  frequency: 'HalfYearly',
  deductionMonths: [6, 12],
};

describe('computeLwf', () => {
  it('is not applicable when no rule is supplied', () => {
    const res = computeLwf('MH');
    expect(res.applicable).toBe(false);
    expect(res.total).toBe(0);
    expect(res.frequency).toBe('HalfYearly');
  });

  it('applies in a configured deduction month', () => {
    const res = computeLwf('MH', rule, 6);
    expect(res.applicable).toBe(true);
    expect(res.employee).toBe(25);
    expect(res.employer).toBe(75);
    expect(res.total).toBe(100);
    expect(res.stateCode).toBe('MH');
  });

  it('does not deduct outside the configured months', () => {
    const res = computeLwf('MH', rule, 3);
    expect(res.applicable).toBe(false);
    expect(res.total).toBe(0);
  });

  it('applies year-round when no month is specified', () => {
    const res = computeLwf('MH', rule);
    expect(res.applicable).toBe(true);
    expect(res.total).toBe(100);
  });

  it('defaults deduction months to [6, 12] when not provided', () => {
    const noMonths: LwfRuleInput = { stateCode: 'KA', employeeAmount: 20, employerAmount: 40 };
    expect(computeLwf('KA', noMonths, 12).applicable).toBe(true);
    expect(computeLwf('KA', noMonths, 7).applicable).toBe(false);
  });

  it('clamps negative amounts to zero', () => {
    const neg: LwfRuleInput = { stateCode: 'MH', employeeAmount: -10, employerAmount: -5, deductionMonths: [6] };
    const res = computeLwf('MH', neg, 6);
    expect(res.employee).toBe(0);
    expect(res.employer).toBe(0);
    expect(res.applicable).toBe(false); // total is 0
  });
});
