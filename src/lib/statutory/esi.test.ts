import { describe, it, expect } from 'vitest';
import { computeEsi, ESI_WAGE_THRESHOLD } from './esi';

describe('computeEsi', () => {
  it('is applicable at or below the 21000 threshold', () => {
    const gross = 18_000;
    const res = computeEsi(gross);
    expect(res.applicable).toBe(true);
    // employee 0.75% rounded UP, employer 3.25% rounded UP
    expect(res.employee).toBe(Math.ceil(gross * 0.0075)); // ceil(135) = 135
    expect(res.employer).toBe(Math.ceil(gross * 0.0325)); // ceil(585) = 585
    expect(res.total).toBe(res.employee + res.employer);
  });

  it('rounds contributions UP to the next rupee per ESIC rules', () => {
    const gross = 20_000;
    const res = computeEsi(gross);
    // 20000 * 0.0075 = 150 (exact), 20000 * 0.0325 = 650 (exact)
    expect(res.employee).toBe(150);
    expect(res.employer).toBe(650);

    const odd = computeEsi(15_345);
    // 15345 * 0.0075 = 115.0875 -> ceil 116
    expect(odd.employee).toBe(116);
    // 15345 * 0.0325 = 498.7125 -> ceil 499
    expect(odd.employer).toBe(499);
  });

  it('is applicable exactly at the threshold', () => {
    const res = computeEsi(ESI_WAGE_THRESHOLD);
    expect(res.applicable).toBe(true);
    expect(res.employee).toBe(Math.ceil(ESI_WAGE_THRESHOLD * 0.0075)); // 158
    expect(res.employer).toBe(Math.ceil(ESI_WAGE_THRESHOLD * 0.0325)); // 683
  });

  it('returns 0 and not applicable above the threshold', () => {
    const res = computeEsi(ESI_WAGE_THRESHOLD + 1);
    expect(res.applicable).toBe(false);
    expect(res.employee).toBe(0);
    expect(res.employer).toBe(0);
    expect(res.total).toBe(0);
    expect(res.grossWage).toBe(ESI_WAGE_THRESHOLD + 1);
  });

  it('honours a custom threshold', () => {
    const res = computeEsi(25_000, { threshold: 30_000 });
    expect(res.applicable).toBe(true);
    expect(res.employee).toBe(Math.ceil(25_000 * 0.0075)); // 188
  });

  it('is not applicable for zero or negative gross', () => {
    expect(computeEsi(0).applicable).toBe(false);
    expect(computeEsi(0).total).toBe(0);
    const neg = computeEsi(-100);
    expect(neg.applicable).toBe(false);
    expect(neg.grossWage).toBe(0);
  });
});
