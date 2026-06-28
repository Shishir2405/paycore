/**
 * Convert a rupee amount into Indian-system words (lakh/crore), e.g.
 *   45230.5 -> "Rupees Forty Five Thousand Two Hundred Thirty and Fifty Paise Only"
 *
 * Used by the payslip to print NET PAY in words below the figure.
 */
const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** Words for a number 0..999. */
function below1000(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)];
    const o = n % 10;
    return o ? `${t} ${ONES[o]}` : t;
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return rest ? `${ONES[h]} Hundred ${below1000(rest)}` : `${ONES[h]} Hundred`;
}

/** Words for any non-negative integer using the Indian grouping. */
function intToWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  if (crore) parts.push(`${intToWords(crore)} Crore`);
  if (lakh) parts.push(`${below1000(lakh)} Lakh`);
  if (thousand) parts.push(`${below1000(thousand)} Thousand`);
  if (hundred) parts.push(below1000(hundred));

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Format a rupee amount as words with paise. Negative amounts are prefixed with
 * "Minus". Always ends with "Only".
 */
export function amountInWords(amount: number, currencyWord = 'Rupees'): string {
  const sign = amount < 0 ? 'Minus ' : '';
  const abs = Math.abs(amount);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);

  const rupeeWords = intToWords(rupees);
  const base = `${sign}${currencyWord} ${rupeeWords}`;
  const withPaise = paise > 0 ? `${base} and ${intToWords(paise)} Paise` : base;
  return `${withPaise} Only`;
}
