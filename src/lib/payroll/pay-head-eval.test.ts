import { describe, it, expect } from 'vitest';
import {
  evaluatePayHead,
  validateFormula,
  FormulaError,
  type EvaluablePayHead,
  type PayHeadContext,
} from './pay-head-eval';

const ctx: PayHeadContext = {
  basic: 50_000,
  gross: 100_000,
  heads: { HRA: 20_000, DA: 5_000 },
};

function head(partial: Partial<EvaluablePayHead> & Pick<EvaluablePayHead, 'calcType'>): EvaluablePayHead {
  return { code: 'X', value: 0, ...partial };
}

describe('evaluatePayHead — direct calc types', () => {
  it('Flat returns the configured value', () => {
    expect(evaluatePayHead(head({ calcType: 'Flat', value: 1_500 }), ctx)).toBe(1_500);
  });

  it('PercentOfBasic computes a percentage of basic', () => {
    // 40% of 50,000 = 20,000
    expect(evaluatePayHead(head({ calcType: 'PercentOfBasic', value: 40 }), ctx)).toBe(20_000);
  });

  it('PercentOfGross computes a percentage of gross', () => {
    // 10% of 100,000 = 10,000
    expect(evaluatePayHead(head({ calcType: 'PercentOfGross', value: 10 }), ctx)).toBe(10_000);
  });

  it('clamps negative results to zero', () => {
    expect(evaluatePayHead(head({ calcType: 'Flat', value: -500 }), ctx)).toBe(0);
  });
});

describe('evaluatePayHead — Formula branch', () => {
  it('evaluates {CODE} refs with arithmetic and precedence', () => {
    // {BASIC} * 0.4 + 1250 = 50000*0.4 + 1250 = 21250
    const res = evaluatePayHead(head({ calcType: 'Formula', formula: '{BASIC} * 0.4 + 1250' }), ctx);
    expect(res).toBe(21_250);
  });

  it('resolves sibling pay-head refs (case-insensitive) and GROSS', () => {
    const res = evaluatePayHead(head({ calcType: 'Formula', formula: '{hra} + {DA}' }), ctx);
    expect(res).toBe(25_000);
    expect(evaluatePayHead(head({ calcType: 'Formula', formula: '{GROSS} - {BASIC}' }), ctx)).toBe(50_000);
  });

  it('honours parentheses and the % (modulo) operator', () => {
    // (10 + 5) * 2 = 30
    expect(evaluatePayHead(head({ calcType: 'Formula', formula: '(10 + 5) * 2' }), ctx)).toBe(30);
    // 17 % 5 = 2
    expect(evaluatePayHead(head({ calcType: 'Formula', formula: '17 % 5' }), ctx)).toBe(2);
  });

  it('throws on an empty formula', () => {
    expect(() => evaluatePayHead(head({ calcType: 'Formula', formula: '   ' }), ctx)).toThrow(FormulaError);
  });

  it('throws on an unknown pay-head reference', () => {
    expect(() => evaluatePayHead(head({ calcType: 'Formula', formula: '{UNKNOWN} + 1' }), ctx)).toThrow(
      /Unknown reference/,
    );
  });

  it('throws on division by zero', () => {
    expect(() => evaluatePayHead(head({ calcType: 'Formula', formula: '{BASIC} / 0' }), ctx)).toThrow(
      /Division by zero/,
    );
  });
});

describe('evaluatePayHead — parser SAFETY (must never execute code)', () => {
  const malicious = [
    'process.exit(1)',
    '() => 1',
    'require("fs")',
    'this.constructor',
    'BASIC',          // bare identifier without braces
    'eval("2+2")',
    '__proto__',
    '{BASIC}; 5',     // statement separator
    'globalThis',
  ];

  it.each(malicious)('rejects malicious/invalid input %j by throwing FormulaError', (formula) => {
    expect(() => evaluatePayHead(head({ calcType: 'Formula', formula }), ctx)).toThrow(FormulaError);
  });

  it('rejects an unexpected character rather than executing it', () => {
    expect(() => evaluatePayHead(head({ calcType: 'Formula', formula: '5 & 3' }), ctx)).toThrow(
      /Unexpected character/,
    );
  });

  it('rejects an invalid reference name', () => {
    expect(() => evaluatePayHead(head({ calcType: 'Formula', formula: '{BAD-NAME}' }), ctx)).toThrow(FormulaError);
  });
});

describe('validateFormula (static, zero-context)', () => {
  it('returns null for a structurally valid formula even with unknown refs', () => {
    expect(validateFormula('{ANYTHING} * 2 + 1')).toBeNull();
    expect(validateFormula('{BASIC} * 0.4 + 1250')).toBeNull();
  });

  it('returns an error message for invalid / malicious input', () => {
    expect(validateFormula('process')).not.toBeNull();
    expect(validateFormula('')).not.toBeNull();
    expect(validateFormula('5 +')).not.toBeNull();
    expect(validateFormula('(1 + 2')).not.toBeNull();
  });
});
