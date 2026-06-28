import { describe, it, expect } from 'vitest';
import {
  computeTaxNewRegime,
  computeTaxOldRegime,
  recommendRegime,
  NEW_REGIME_STD_DEDUCTION,
  OLD_REGIME_STD_DEDUCTION,
} from './regime';

describe('computeTaxNewRegime (FY 2024-25)', () => {
  it('applies the 75000 standard deduction and progressive slabs', () => {
    // Gross 1,200,000 -> net 1,125,000
    // tax: 5% of (700k-300k)=20000 + 10% of (1000k-700k)=30000 + 15% of (1125k-1000k)=18750 = 68750
    const res = computeTaxNewRegime(1_200_000);
    expect(res.taxableIncome).toBe(1_125_000);
    expect(res.taxBeforeRebate).toBe(68_750);
    expect(res.rebate).toBe(0);
    expect(res.cess).toBe(2_750); // 4% of 68750
    expect(res.totalTax).toBe(71_500);
  });

  it('87A rebate makes tax NIL exactly at the 700000 taxable boundary', () => {
    // Gross 775,000 -> net exactly 700,000 (within 87A limit)
    const res = computeTaxNewRegime(700_000 + NEW_REGIME_STD_DEDUCTION);
    expect(res.taxableIncome).toBe(700_000);
    expect(res.taxBeforeRebate).toBe(20_000);
    expect(res.rebate).toBe(20_000);
    expect(res.totalTax).toBe(0);
  });

  it('loses the rebate just over the boundary, with 4% cess applied', () => {
    // Gross 776,000 -> net 701,000 (just over the 700k limit)
    const res = computeTaxNewRegime(776_000);
    expect(res.taxableIncome).toBe(701_000);
    expect(res.rebate).toBe(0);
    expect(res.cess).toBe(804); // 4% of 20100
    expect(res.totalTax).toBe(20_904);
  });

  it('standard-deduction constant matches FY24-25 new regime (75000)', () => {
    expect(NEW_REGIME_STD_DEDUCTION).toBe(75_000);
  });
});

describe('computeTaxOldRegime (FY 2024-25)', () => {
  it('87A rebate makes tax NIL exactly at the 500000 taxable boundary', () => {
    // Gross 550,000 -> net exactly 500,000
    const res = computeTaxOldRegime(500_000 + OLD_REGIME_STD_DEDUCTION);
    expect(res.taxableIncome).toBe(500_000);
    expect(res.taxBeforeRebate).toBe(12_500);
    expect(res.rebate).toBe(12_500);
    expect(res.totalTax).toBe(0);
  });

  it('loses the rebate just over the 500000 boundary with cess', () => {
    // Gross 551,000 -> net 501,000
    const res = computeTaxOldRegime(551_000);
    expect(res.taxableIncome).toBe(501_000);
    expect(res.rebate).toBe(0);
    expect(res.cess).toBe(508); // 4% of 12700
    expect(res.totalTax).toBe(13_208);
  });

  it('applies the 50000 standard deduction and old slabs', () => {
    // Gross 1,200,000 -> net 1,150,000
    // tax: 5% of (500k-250k)=12500 + 20% of (1000k-500k)=100000 + 30% of (1150k-1000k)=45000 = 157500
    const res = computeTaxOldRegime(1_200_000);
    expect(res.taxableIncome).toBe(1_150_000);
    expect(res.taxBeforeRebate).toBe(157_500);
    expect(res.cess).toBe(6_300);
    expect(res.totalTax).toBe(163_800);
  });

  it('standard-deduction constant matches FY24-25 old regime (50000)', () => {
    expect(OLD_REGIME_STD_DEDUCTION).toBe(50_000);
  });
});

describe('recommendRegime', () => {
  it('picks the lower-tax regime and reports the savings', () => {
    // Gross 1,500,000 with 200,000 deductions.
    // Old base = 1,300,000 -> net 1,250,000 -> totalTax 195,000
    // New = 1,500,000 -> net 1,425,000 -> totalTax 130,000
    const res = recommendRegime(1_500_000, 200_000);
    expect(res.old.totalTax).toBe(195_000);
    expect(res.new.totalTax).toBe(130_000);
    expect(res.recommended).toBe('New');
    expect(res.savings).toBe(65_000);
  });

  it('recommends Old when large deductions make it cheaper', () => {
    // Heavy deductions push the old base well below the new regime tax.
    const res = recommendRegime(900_000, 350_000);
    // Old base = 550,000 -> net 500,000 -> rebate -> 0 tax
    expect(res.old.totalTax).toBe(0);
    expect(res.recommended).toBe('Old');
    expect(res.savings).toBe(res.new.totalTax - res.old.totalTax);
  });

  it('ties favour New (simpler compliance)', () => {
    // With zero deductions and very low income both regimes are 0 (rebate) -> tie -> New.
    const res = recommendRegime(400_000, 0);
    expect(res.old.totalTax).toBe(0);
    expect(res.new.totalTax).toBe(0);
    expect(res.recommended).toBe('New');
    expect(res.savings).toBe(0);
  });
});
