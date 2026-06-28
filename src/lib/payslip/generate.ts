/**
 * Payslip PDF generator. Builds an invoice-grade payslip for a single payroll
 * entry: branded company header, employee + pay-period block, an
 * earnings/deductions table, the net-pay highlight, and a footer. Returns raw
 * bytes (Uint8Array) the route streams as application/pdf.
 *
 * Pure presentation — it receives already-resolved data (entry/employee/company/
 * run) and never touches the database.
 */
import { rgb } from 'pdf-lib';
import {
  createDocument,
  drawHeader,
  drawKeyValueBlock,
  drawTable,
  drawFooter,
  MARGIN,
  PAGE,
  type PdfColumn,
} from '@/lib/pdf/document';
import { amountInWords } from './amount-in-words';
import type { PayrollEntryDoc } from '@/models/PayrollEntry';
import type { PayrollRunDoc } from '@/models/PayrollRun';

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Minimal company shape the payslip needs (subset of CompanyDoc). */
export type PayslipCompany = {
  name: string;
  address?: { line1?: string; city?: string; state?: string; pincode?: string };
  pan?: string;
  pfEstablishmentId?: string;
};

/** Minimal employee shape the payslip needs (subset of EmployeeDoc). */
export type PayslipEmployee = {
  employeeCode: string;
  designation?: string;
  department?: string;
  uan?: string;
  pan?: string;
  bankName?: string;
  accountMasked?: string;
};

function inr(n: number): string {
  return `${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Greedy word-wrap a single string to lines fitting `maxWidth` at `size`. */
function wrapText(
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  text: string,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Render a payslip for one entry. `employee`/`company` carry only the fields the
 * payslip displays so the caller controls masking/decryption decisions.
 */
export async function generatePayslipPdf(
  entry: Pick<
    PayrollEntryDoc,
    'employeeName' | 'employeeCode' | 'earnings' | 'deductions' | 'gross' | 'totalDeductions' | 'net' | 'lop'
  >,
  employee: PayslipEmployee,
  company: PayslipCompany,
  run: Pick<PayrollRunDoc, 'month' | 'year'>,
): Promise<Uint8Array> {
  const doc = await createDocument();
  const { page } = doc.addPage();

  const period = `${MONTHS[run.month] ?? run.month} ${run.year}`;

  let y = drawHeader(page, doc.fonts, {
    companyName: company.name,
    title: 'Payslip',
    subtitle: `Pay period: ${period}`,
  });

  // Employee + period meta block.
  y = drawKeyValueBlock(
    page,
    doc.fonts,
    [
      { label: 'Employee', value: entry.employeeName },
      { label: 'Employee code', value: entry.employeeCode },
      { label: 'Designation', value: employee.designation ?? '—' },
      { label: 'Department', value: employee.department ?? '—' },
      { label: 'UAN', value: employee.uan ?? '—' },
      { label: 'PAN', value: employee.pan ?? '—' },
      { label: 'Bank', value: employee.bankName ?? '—' },
      { label: 'Account', value: employee.accountMasked ?? '—' },
      { label: 'Pay period', value: period },
      { label: 'LOP days', value: String(entry.lop ?? 0) },
    ],
    y,
    2,
  );

  y -= 6;

  // Side-by-side earnings + deductions modelled as one two-pair-per-row table.
  const columns: PdfColumn[] = [
    { header: 'Earnings', width: 0.32 },
    { header: 'Amount', width: 0.18, align: 'right' },
    { header: 'Deductions', width: 0.32 },
    { header: 'Amount', width: 0.18, align: 'right' },
  ];

  const earnings = entry.earnings ?? [];
  const deductions = entry.deductions ?? [];
  const rowCount = Math.max(earnings.length, deductions.length);
  const rows: string[][] = [];
  for (let i = 0; i < rowCount; i += 1) {
    const e = earnings[i];
    const d = deductions[i];
    rows.push([
      e ? e.name : '',
      e ? inr(e.amount) : '',
      d ? d.name : '',
      d ? inr(d.amount) : '',
    ]);
  }

  const totals = ['Gross', inr(entry.gross), 'Total deductions', inr(entry.totalDeductions)];
  y = drawTable(page, doc.fonts, columns, rows, y, totals);

  // Net pay highlight row.
  y -= 4;
  y = drawTable(
    page,
    doc.fonts,
    [
      { header: 'Net Pay', width: 0.7 },
      { header: '', width: 0.3, align: 'right' },
    ],
    [['Net payable for the period', inr(entry.net)]],
    y,
  );

  // Net pay in words, wrapped to the content width.
  y -= 8;
  const words = `Net pay in words: ${amountInWords(entry.net)}`;
  const maxWidth = PAGE.width - MARGIN * 2;
  const lines = wrapText(doc.fonts.regular, words, 8.5, maxWidth);
  for (const line of lines) {
    page.drawText(line, {
      x: MARGIN,
      y,
      size: 8.5,
      font: doc.fonts.regular,
      color: rgb(0.42, 0.46, 0.52),
    });
    y -= 12;
  }

  drawFooter(
    page,
    doc.fonts,
    `${company.name}${company.pan ? ` · PAN ${company.pan}` : ''} — This is a system-generated payslip and needs no signature.`,
  );

  return doc.save();
}
