import { api } from './client';

export type PayslipRow = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  gross: number;
  totalDeductions: number;
  net: number;
};

export type ReportKind = 'salary-register' | 'epf-ecr' | 'esic' | 'bank-transfer';
export type ReportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

export const payslipsApi = {
  /** Payslip rows (one per employee) for a payroll run. */
  listByRun: (runId: string) => api.get<PayslipRow[]>('/payslips', { runId }),
  /** Alias of `listByRun`. */
  list: (runId: string) => api.get<PayslipRow[]>('/payslips', { runId }),

  /** Browser href for a single payslip PDF download. */
  payslipPdfUrl: (entryId: string) => api.downloadUrl(`/payslips/${entryId}/pdf`),
  /** Alias of `payslipPdfUrl`. */
  pdfUrl: (entryId: string) => api.downloadUrl(`/payslips/${entryId}/pdf`),

  /** Browser href for a bulk report download in the chosen format. */
  reportUrl: (kind: ReportKind, runId: string, format: ReportFormat = 'csv') =>
    api.downloadUrl(`/reports/${kind}`, { runId, format }),
};
