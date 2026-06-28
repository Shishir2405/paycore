/**
 * Bank transfer file builder. One row per employee with their net pay and bank
 * details, in the generic layout most Indian bank bulk-upload portals accept
 * (beneficiary name, account, IFSC, amount). The service supplies decrypted/
 * masked bank details per employee.
 */
import type { Column } from '@/lib/utils/tabular';
import type { PayrollEntryDoc } from '@/models/PayrollEntry';

export type BankTransferRow = {
  employeeCode: string;
  beneficiaryName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  amount: number;
  narration: string;
};

export const BANK_TRANSFER_COLUMNS: Column<BankTransferRow>[] = [
  { key: 'employeeCode', header: 'Employee Code' },
  { key: 'beneficiaryName', header: 'Beneficiary Name' },
  { key: 'accountNumber', header: 'Account Number' },
  { key: 'ifsc', header: 'IFSC' },
  { key: 'bankName', header: 'Bank Name' },
  { key: 'amount', header: 'Amount' },
  { key: 'narration', header: 'Narration' },
];

export type BankDetail = {
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  accountHolderName?: string;
};

export function buildBankTransfer(
  entries: PayrollEntryDoc[],
  bankByEmployee: Record<string, BankDetail | undefined>,
  period: string,
): BankTransferRow[] {
  return entries
    .filter((e) => e.net > 0)
    .map((e) => {
      const bank = bankByEmployee[String(e.employeeId)] ?? {};
      return {
        employeeCode: e.employeeCode,
        beneficiaryName: bank.accountHolderName || e.employeeName,
        accountNumber: bank.accountNumber ?? '',
        ifsc: bank.ifsc ?? '',
        bankName: bank.bankName ?? '',
        amount: e.net,
        narration: `Salary ${period}`,
      };
    });
}
