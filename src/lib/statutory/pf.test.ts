import { describe, it, expect } from 'vitest';
import {
  computePf,
  PF_WAGE_CEILING,
  EPS_RATE,
  PF_EMPLOYEE_RATE,
  PF_EMPLOYER_RATE,
} from './pf';

describe('computePf', () => {
  it('uses 12% for employee/employer on the full wage below the ceiling', () => {
    const wage = 10_000;
    const res = computePf(wage);
    expect(res.pfWage).toBe(wage);
    expect(res.contributionBase).toBe(wage);
    expect(res.employee).toBe(Math.round(wage * PF_EMPLOYEE_RATE)); // 1200
    expect(res.employer).toBe(Math.round(wage * PF_EMPLOYER_RATE)); // 1200
  });

  it('splits employer 12% into EPS (8.33% of wage) and EPF remainder below ceiling', () => {
    const wage = 10_000;
    const res = computePf(wage);
    // EPS on min(wage, ceiling) = 10000 * 0.0833 = 833
    expect(res.employerEps).toBe(Math.round(wage * EPS_RATE)); // 833
    expect(res.employerEpf).toBe(res.employer - res.employerEps); // 1200 - 833 = 367
    // EPS + EPF must sum back to the employer 12%
    expect(res.employerEps + res.employerEpf).toBe(res.employer);
  });

  it('caps EPS at the 15000 ceiling when the wage exceeds it (uncapped contribution by default)', () => {
    const wage = 25_000;
    const res = computePf(wage);
    // Default: contributions on the FULL wage (capContribution not set)
    expect(res.contributionBase).toBe(wage);
    expect(res.employee).toBe(Math.round(wage * 0.12)); // 3000
    expect(res.employer).toBe(Math.round(wage * 0.12)); // 3000
    // EPS is ALWAYS on the ceiling: 15000 * 0.0833 = 1250 (rounded -> 1250)
    expect(res.employerEps).toBe(Math.round(PF_WAGE_CEILING * EPS_RATE)); // 1250
    expect(res.employerEpf).toBe(res.employer - res.employerEps); // 3000 - 1250 = 1750
  });

  it('caps the 12% contributions at the ceiling when capContribution is true', () => {
    const wage = 25_000;
    const res = computePf(wage, { capContribution: true });
    expect(res.contributionBase).toBe(PF_WAGE_CEILING); // 15000
    expect(res.employee).toBe(Math.round(PF_WAGE_CEILING * 0.12)); // 1800
    expect(res.employer).toBe(Math.round(PF_WAGE_CEILING * 0.12)); // 1800
    expect(res.employerEps).toBe(Math.round(PF_WAGE_CEILING * EPS_RATE)); // 1250
    expect(res.employerEpf).toBe(res.employer - res.employerEps); // 1800 - 1250 = 550
  });

  it('exactly at the ceiling computes EPS on the ceiling', () => {
    const res = computePf(PF_WAGE_CEILING);
    expect(res.employee).toBe(1800);
    expect(res.employer).toBe(1800);
    expect(res.employerEps).toBe(1250);
    expect(res.employerEpf).toBe(550);
  });

  it('total equals employee + employer', () => {
    const res = computePf(18_000);
    expect(res.total).toBe(res.employee + res.employer);
  });

  it('honours a custom ceiling', () => {
    const res = computePf(30_000, { ceiling: 30_000 });
    // EPS now on 30000 * 0.0833 = 2499
    expect(res.employerEps).toBe(Math.round(30_000 * EPS_RATE)); // 2499
  });

  it('returns zeros for zero or negative wage', () => {
    expect(computePf(0).total).toBe(0);
    const neg = computePf(-500);
    expect(neg.pfWage).toBe(0);
    expect(neg.total).toBe(0);
  });
});
