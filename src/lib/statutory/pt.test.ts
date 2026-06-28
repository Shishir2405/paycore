import { describe, it, expect } from 'vitest';
import { computePt, MAHARASHTRA_DEFAULT_SLABS, type PtSlabRow } from './pt';

describe('computePt — Maharashtra default slabs', () => {
  it('falls back to the MH default when no slabs are supplied', () => {
    const res = computePt(5_000, '27');
    expect(res.usedDefault).toBe(true);
    expect(res.stateCode).toBe('MH');
  });

  it('returns 0 in the lowest slab (<= 7500)', () => {
    expect(computePt(7_500, '27').amount).toBe(0);
    expect(computePt(0, '27').amount).toBe(0);
  });

  it('returns 175 for the middle slab (7501–10000)', () => {
    expect(computePt(9_000, '27').amount).toBe(175);
    expect(computePt(7_501, '27').amount).toBe(175);
    expect(computePt(10_000, '27').amount).toBe(175);
  });

  it('returns 200 for the top generic slab (>= 10001)', () => {
    expect(computePt(10_001, '27').amount).toBe(200);
    expect(computePt(50_000, '27').amount).toBe(200);
  });

  it('applies the February ₹300 top-up for the top slab only in month 2', () => {
    expect(computePt(50_000, '27', [], 2).amount).toBe(300);
    // non-February months still 200
    expect(computePt(50_000, '27', [], 6).amount).toBe(200);
    // a lower slab is unaffected by the Feb top-up
    expect(computePt(9_000, '27', [], 2).amount).toBe(175);
  });

  it('default table is the exported MH default reference', () => {
    expect(MAHARASHTRA_DEFAULT_SLABS.length).toBeGreaterThan(0);
  });
});

describe('computePt — custom state slabs', () => {
  const customSlabs: PtSlabRow[] = [
    { stateCode: 'KA', fromAmount: 0, toAmount: 24_999, amount: 0 },
    { stateCode: 'KA', fromAmount: 25_000, toAmount: null, amount: 200 },
  ];

  it('uses supplied slabs and the given state code', () => {
    const low = computePt(20_000, 'KA', customSlabs);
    expect(low.usedDefault).toBe(false);
    expect(low.stateCode).toBe('KA');
    expect(low.amount).toBe(0);

    const high = computePt(30_000, 'KA', customSlabs);
    expect(high.amount).toBe(200);
  });

  it('returns 0 when no slab matches', () => {
    const noMatch: PtSlabRow[] = [{ stateCode: 'KA', fromAmount: 100_000, toAmount: 200_000, amount: 50 }];
    expect(computePt(5_000, 'KA', noMatch).amount).toBe(0);
  });
});
