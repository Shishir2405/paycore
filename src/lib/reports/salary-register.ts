/**
 * Salary register — the master payroll sheet for a run: one row per employee with
 * gross, the statutory split, total deductions and net. Feeds the unified
 * exporter (csv/xlsx/pdf/json).
 */
import type { Column } from '@/lib/utils/tabular';
import type { PayrollEntryDoc } from '@/models/PayrollEntry';

export type SalaryRegisterRow = {
  employeeCode: string;
  employeeName: string;
  gross: number;
  pf: number;
  esi: number;
  pt: number;
  tds: number;
  totalDeductions: number;
  net: number;
};

export const SALARY_REGISTER_COLUMNS: Column<SalaryRegisterRow>[] = [
  { key: 'employeeCode', header: 'Employee Code' },
  { key: 'employeeName', header: 'Employee Name' },
  { key: 'gross', header: 'Gross' },
  { key: 'pf', header: 'PF' },
  { key: 'esi', header: 'ESI' },
  { key: 'pt', header: 'PT' },
  { key: 'tds', header: 'TDS' },
  { key: 'totalDeductions', header: 'Total Deductions' },
  { key: 'net', header: 'Net Pay' },
];

export function buildSalaryRegister(entries: PayrollEntryDoc[]): SalaryRegisterRow[] {
  return entries.map((e) => ({
    employeeCode: e.employeeCode,
    employeeName: e.employeeName,
    gross: e.gross,
    pf: e.pf,
    esi: e.esi,
    pt: e.pt,
    tds: e.tds,
    totalDeductions: e.totalDeductions,
    net: e.net,
  }));
}
