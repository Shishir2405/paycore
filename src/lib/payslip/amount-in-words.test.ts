import { describe, it, expect } from 'vitest';
import { amountInWords } from './amount-in-words';

describe('amountInWords (Indian numbering)', () => {
  it('renders zero', () => {
    expect(amountInWords(0)).toBe('Rupees Zero Only');
  });

  it('renders a small whole amount', () => {
    expect(amountInWords(1)).toBe('Rupees One Only');
    expect(amountInWords(100)).toBe('Rupees One Hundred Only');
    expect(amountInWords(999)).toBe('Rupees Nine Hundred Ninety Nine Only');
  });

  it('renders thousands with paise', () => {
    expect(amountInWords(45230.5)).toBe(
      'Rupees Forty Five Thousand Two Hundred Thirty and Fifty Paise Only',
    );
  });

  it('renders lakhs', () => {
    expect(amountInWords(1_500_000)).toBe('Rupees Fifteen Lakh Only');
  });

  it('renders crores with full grouping and paise', () => {
    expect(amountInWords(12_345_678.75)).toBe(
      'Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight and Seventy Five Paise Only',
    );
  });

  it('renders paise-only fractional component', () => {
    expect(amountInWords(70.5)).toBe('Rupees Seventy and Fifty Paise Only');
  });

  it('prefixes negative amounts with Minus', () => {
    expect(amountInWords(-250.25)).toBe('Minus Rupees Two Hundred Fifty and Twenty Five Paise Only');
  });

  it('honours a custom currency word', () => {
    expect(amountInWords(5, 'Dollars')).toBe('Dollars Five Only');
  });
});
