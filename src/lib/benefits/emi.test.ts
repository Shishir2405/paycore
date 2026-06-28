import { describe, it, expect } from 'vitest';
import { computeEmi, generateEmiSchedule, totalInterest } from './emi';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

describe('computeEmi (reducing balance)', () => {
  it('computes the standard level EMI for principal/rate/tenure', () => {
    // ₹100,000 @ 12% p.a. for 12 months -> 8884.88
    expect(computeEmi(100_000, 12, 12)).toBe(8884.88);
  });

  it('uses a straight-line split for a 0% interest loan', () => {
    expect(computeEmi(120_000, 0, 12)).toBe(10_000);
  });

  it('returns 0 for non-positive principal or tenure', () => {
    expect(computeEmi(0, 12, 12)).toBe(0);
    expect(computeEmi(-100, 12, 12)).toBe(0);
    expect(computeEmi(100_000, 12, 0)).toBe(0);
  });
});

describe('generateEmiSchedule', () => {
  it('produces a row per month with a final balance of exactly 0', () => {
    const rows = generateEmiSchedule(100_000, 12, 12);
    expect(rows).toHaveLength(12);
    expect(rows[rows.length - 1].balance).toBe(0);
    rows.forEach((r, idx) => expect(r.monthIndex).toBe(idx + 1));
  });

  it('principal parts sum exactly to the principal', () => {
    const rows = generateEmiSchedule(100_000, 12, 12);
    const sumPrincipal = round2(rows.reduce((s, r) => s + r.principalPart, 0));
    expect(sumPrincipal).toBe(100_000);
  });

  it('first installment is mostly interest, balance reduces monotonically', () => {
    const rows = generateEmiSchedule(100_000, 12, 12);
    expect(rows[0].interestPart).toBe(1_000); // 100000 * 1% monthly
    expect(rows[0].principalPart).toBe(7884.88); // emi 8884.88 - interest 1000, rounded to 2dp
    expect(rows[0].principalPart + rows[0].interestPart).toBeCloseTo(rows[0].emi, 2);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i].balance).toBeLessThanOrEqual(rows[i - 1].balance);
    }
  });

  it('0% interest schedule has zero interest and sums to principal', () => {
    const rows = generateEmiSchedule(120_000, 0, 12);
    expect(rows.every((r) => r.interestPart === 0)).toBe(true);
    expect(rows[rows.length - 1].balance).toBe(0);
    expect(round2(rows.reduce((s, r) => s + r.principalPart, 0))).toBe(120_000);
  });

  it('returns an empty schedule for non-positive inputs', () => {
    expect(generateEmiSchedule(0, 12, 12)).toEqual([]);
    expect(generateEmiSchedule(100_000, 12, 0)).toEqual([]);
  });
});

describe('totalInterest', () => {
  it('is positive for an interest-bearing loan and zero for 0%', () => {
    expect(totalInterest(100_000, 12, 12)).toBeGreaterThan(0);
    expect(totalInterest(120_000, 0, 12)).toBe(0);
  });

  it('equals the sum of interest parts in the schedule', () => {
    const rows = generateEmiSchedule(100_000, 12, 12);
    const expected = round2(rows.reduce((s, r) => s + r.interestPart, 0));
    expect(totalInterest(100_000, 12, 12)).toBe(expected);
  });
});
