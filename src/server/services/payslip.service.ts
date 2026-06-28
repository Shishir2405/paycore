/**
 * Payslips & reports domain logic. Lists payslip rows for a run, generates a
 * single payslip PDF (resolving employee/company/dept), and produces the bulk
 * statutory/finance exports (salary register, EPF ECR, ESIC, bank transfer) via
 * the unified exporter. Reads models directly for the enrichment joins it needs.
 */
import { Employee, type EmployeeDoc } from '@/models/Employee';
import { Company } from '@/models/Company';
import { Department } from '@/models/Department';
import { Designation } from '@/models/Designation';
import type { PayrollEntryDoc } from '@/models/PayrollEntry';
import type { PayrollRunDoc } from '@/models/PayrollRun';
import { payrollRunRepository } from '@/server/repositories/payroll-run.repository';
import { generatePayslipPdf, type PayslipCompany, type PayslipEmployee } from '@/lib/payslip/generate';
import { exportRows, type ExportFormat, type ExportResult } from '@/lib/export/exporter';
import { decryptField, maskSensitive } from '@/lib/utils/crypto';
import { recordAudit } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import {
  buildSalaryRegister,
  SALARY_REGISTER_COLUMNS,
} from '@/lib/reports/salary-register';
import { buildEpfEcr, EPF_ECR_COLUMNS } from '@/lib/reports/epf-ecr';
import { buildEsic, ESIC_COLUMNS } from '@/lib/reports/esic';
import { buildBankTransfer, BANK_TRANSFER_COLUMNS, type BankDetail } from '@/lib/reports/bank-transfer';
import type { AuthContext } from '@/types';

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

function toPayslipRow(e: PayrollEntryDoc): PayslipRow {
  return {
    id: String(e._id),
    employeeId: String(e.employeeId),
    employeeCode: e.employeeCode,
    employeeName: e.employeeName,
    gross: e.gross,
    totalDeductions: e.totalDeductions,
    net: e.net,
  };
}

/** Run header guaranteed present, or 404. */
async function loadRun(ctx: AuthContext, runId: string): Promise<PayrollRunDoc> {
  const run = await payrollRunRepository.findById(ctx.companyId, runId);
  if (!run) throw AppError.notFound('Payroll run not found');
  return run as PayrollRunDoc;
}

export const payslipService = {
  /** Payslip rows (entries) for a run — backs the payslips list UI. */
  async list(ctx: AuthContext, runId: string): Promise<PayslipRow[]> {
    await loadRun(ctx, runId);
    const entries = await payrollRunRepository.listEntries(ctx.companyId, runId);
    return entries.map(toPayslipRow);
  },

  /** Generate a single payslip PDF for one entry. */
  async generateOne(ctx: AuthContext, entryId: string): Promise<{ bytes: Uint8Array; filename: string }> {
    const entry = await payrollRunRepository.findEntry(ctx.companyId, entryId);
    if (!entry) throw AppError.notFound('Payslip entry not found');
    const run = await loadRun(ctx, String(entry.runId));

    const [emp, company] = await Promise.all([
      Employee.findOne({ _id: entry.employeeId, companyId: ctx.companyId, isDeleted: false })
        .select('+panEnc +bank.accountNumberEnc')
        .lean<EmployeeDoc>()
        .exec(),
      Company.findById(ctx.companyId).lean().exec(),
    ]);

    const [dept, desig] = await Promise.all([
      emp?.departmentId
        ? Department.findById(emp.departmentId).select('name').lean().exec()
        : null,
      emp?.designationId
        ? Designation.findById(emp.designationId).select('name').lean().exec()
        : null,
    ]);

    const acct = emp?.bank?.accountNumberEnc ? decryptField(emp.bank.accountNumberEnc) : undefined;
    const pan = emp?.panEnc ? decryptField(emp.panEnc) : undefined;

    const payslipEmployee: PayslipEmployee = {
      employeeCode: entry.employeeCode,
      designation: desig?.name,
      department: dept?.name,
      uan: emp?.uan,
      pan: pan ? maskSensitive(pan, 4) : undefined,
      bankName: emp?.bank?.bankName,
      accountMasked: acct ? maskSensitive(acct, 4) : undefined,
    };

    const payslipCompany: PayslipCompany = {
      name: company?.name ?? 'Company',
      pan: company?.pan,
      pfEstablishmentId: company?.pfEstablishmentId,
    };

    const bytes = await generatePayslipPdf(entry, payslipEmployee, payslipCompany, run);
    const filename = `payslip-${entry.employeeCode}-${run.month}-${run.year}.pdf`;

    await recordAudit(ctx, {
      action: 'export',
      module: 'payslips',
      entityId: entryId,
      summary: `Generated payslip for ${entry.employeeCode} (${MONTHS[run.month]} ${run.year})`,
    });

    return { bytes, filename };
  },

  /** Build a bulk report for a run in the requested format. */
  async report(
    ctx: AuthContext,
    kind: ReportKind,
    runId: string,
    format: ExportFormat,
  ): Promise<ExportResult & { filename: string }> {
    const run = await loadRun(ctx, runId);
    const entries = await payrollRunRepository.listEntries(ctx.companyId, runId);
    const period = `${MONTHS[run.month] ?? run.month} ${run.year}`;
    const company = await Company.findById(ctx.companyId).select('name').lean().exec();
    const companyName = company?.name ?? 'PayCore';

    let result: ExportResult;
    let title: string;

    switch (kind) {
      case 'salary-register': {
        title = `Salary Register — ${period}`;
        result = await exportRows(buildSalaryRegister(entries), SALARY_REGISTER_COLUMNS, format, {
          title,
          companyName,
        });
        break;
      }
      case 'epf-ecr': {
        title = `EPF ECR — ${period}`;
        const uanMap = await this.uanMap(ctx, entries);
        result = await exportRows(buildEpfEcr(entries, uanMap), EPF_ECR_COLUMNS, format, {
          title,
          companyName,
        });
        break;
      }
      case 'esic': {
        title = `ESIC — ${period}`;
        const esicMap = await this.esicMap(ctx, entries);
        result = await exportRows(buildEsic(entries, esicMap), ESIC_COLUMNS, format, {
          title,
          companyName,
        });
        break;
      }
      case 'bank-transfer': {
        title = `Bank Transfer — ${period}`;
        const bankMap = await this.bankMap(ctx, entries);
        result = await exportRows(buildBankTransfer(entries, bankMap, period), BANK_TRANSFER_COLUMNS, format, {
          title,
          companyName,
        });
        break;
      }
      default:
        throw AppError.badRequest(`Unknown report "${String(kind)}"`);
    }

    await recordAudit(ctx, {
      action: 'export',
      module: 'payslips',
      entityId: runId,
      summary: `Exported ${kind} (${format}) for ${period}`,
    });

    return { ...result, filename: `${kind}-${run.month}-${run.year}.${result.ext}` };
  },

  // ── Enrichment maps (employeeId -> identifier/bank) ──────────────────────────

  async uanMap(ctx: AuthContext, entries: PayrollEntryDoc[]): Promise<Record<string, string | undefined>> {
    const ids = entries.map((e) => e.employeeId);
    const rows = await Employee.find({ _id: { $in: ids }, companyId: ctx.companyId })
      .select('uan')
      .lean<{ _id: unknown; uan?: string }[]>()
      .exec();
    return Object.fromEntries(rows.map((r) => [String(r._id), r.uan]));
  },

  async esicMap(ctx: AuthContext, entries: PayrollEntryDoc[]): Promise<Record<string, string | undefined>> {
    const ids = entries.map((e) => e.employeeId);
    const rows = await Employee.find({ _id: { $in: ids }, companyId: ctx.companyId })
      .select('esicNumber')
      .lean<{ _id: unknown; esicNumber?: string }[]>()
      .exec();
    return Object.fromEntries(rows.map((r) => [String(r._id), r.esicNumber]));
  },

  async bankMap(ctx: AuthContext, entries: PayrollEntryDoc[]): Promise<Record<string, BankDetail | undefined>> {
    const ids = entries.map((e) => e.employeeId);
    const rows = await Employee.find({ _id: { $in: ids }, companyId: ctx.companyId })
      .select('+bank.accountNumberEnc bank')
      .lean<EmployeeDoc[]>()
      .exec();
    return Object.fromEntries(
      rows.map((r) => [
        String(r._id),
        {
          accountNumber: r.bank?.accountNumberEnc ? decryptField(r.bank.accountNumberEnc) : undefined,
          ifsc: r.bank?.ifsc,
          bankName: r.bank?.bankName,
          accountHolderName: r.bank?.accountHolderName,
        } as BankDetail,
      ]),
    );
  },
};
