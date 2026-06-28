/**
 * Bank disbursement file builder. Produces the delimited text a company uploads
 * to its bank's bulk-payment portal for salary credits. The common Indian
 * net-banking format is a header line + one pipe-delimited row per beneficiary
 * (NEFT/RTGS payment type, IFSC, account, amount). Pure + testable.
 */

export type BankPaymentRow = {
  /** Beneficiary employee code / reference. */
  beneficiaryRef: string;
  beneficiaryName: string;
  accountNumber: string;
  ifsc: string;
  amount: number;
  /** Optional narration shown on the beneficiary's statement. */
  narration?: string;
};

export type BankFileResult = {
  content: string;
  totalAmount: number;
  recordCount: number;
};

const DELIM = '|';

/** Strip the delimiter + newlines from any field so a row can't be broken. */
function clean(value: string): string {
  return String(value ?? '').replace(/[|\r\n]/g, ' ').trim();
}

/**
 * Build a NEFT/RTGS bulk-upload text file. Each row:
 *   PAYMODE|BENEFICIARY_NAME|ACCOUNT|IFSC|AMOUNT|REF|NARRATION
 * A header row labels the columns. Returns control totals for reconciliation.
 */
export function buildNeftFile(
  rows: BankPaymentRow[],
  options?: { payMode?: 'NEFT' | 'RTGS'; valueDate?: Date },
): BankFileResult {
  const payMode = options?.payMode ?? 'NEFT';
  const header = ['PAYMODE', 'BENEFICIARY_NAME', 'ACCOUNT_NUMBER', 'IFSC', 'AMOUNT', 'REFERENCE', 'NARRATION'].join(DELIM);

  let totalAmount = 0;
  const body = rows.map((r) => {
    const amount = Math.round((r.amount + Number.EPSILON) * 100) / 100;
    totalAmount += amount;
    return [
      payMode,
      clean(r.beneficiaryName),
      clean(r.accountNumber),
      clean(r.ifsc).toUpperCase(),
      amount.toFixed(2),
      clean(r.beneficiaryRef),
      clean(r.narration ?? `Salary ${payMode}`),
    ].join(DELIM);
  });

  // Trailer with control totals — banks reconcile against this.
  const trailer = ['TRAILER', String(rows.length), (Math.round(totalAmount * 100) / 100).toFixed(2)].join(DELIM);

  const content = [header, ...body, trailer].join('\n') + '\n';
  return {
    content,
    totalAmount: Math.round(totalAmount * 100) / 100,
    recordCount: rows.length,
  };
}
