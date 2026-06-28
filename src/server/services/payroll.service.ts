/**
 * Payroll run orchestration — list, detail (with entries), and the maker-checker
 * lifecycle (calculate → approve → lock). `calculate` runs the engine and
 * persists the run header + per-employee entries; approve/lock are guarded state
 * transitions, each audited.
 */
import type { PayrollRunDoc } from '@/models/PayrollRun';
import type { PayrollEntryDoc } from '@/models/PayrollEntry';
import {
  payrollRunRepository,
  type PayrollRunFilter,
} from '@/server/repositories/payroll-run.repository';
import { runPayroll } from '@/lib/payroll/engine';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type { PayrollRunCreateInput } from '@/lib/validators/payroll';

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export type PublicPayrollRun = {
  id: string;
  month: number;
  monthName: string;
  year: number;
  status: string;
  totals: { gross: number; deductions: number; net: number; employerCost: number; headcount: number };
  makerId?: string | null;
  checkerId?: string | null;
  lockedAt?: Date | null;
  notes?: string;
  createdAt?: Date;
};

export type PublicPayrollEntry = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  earnings: { code: string; name: string; amount: number }[];
  deductions: { code: string; name: string; amount: number }[];
  gross: number;
  totalDeductions: number;
  net: number;
  pf: number;
  esi: number;
  pt: number;
  tds: number;
  lop: number;
};

function toPublicRun(doc: Record<string, unknown>): PublicPayrollRun {
  const d = doc as unknown as PayrollRunDoc & { _id: unknown; createdAt?: Date };
  return {
    id: String(d._id),
    month: d.month,
    monthName: MONTHS[d.month] ?? String(d.month),
    year: d.year,
    status: d.status,
    totals: {
      gross: d.totals?.gross ?? 0,
      deductions: d.totals?.deductions ?? 0,
      net: d.totals?.net ?? 0,
      employerCost: d.totals?.employerCost ?? 0,
      headcount: d.totals?.headcount ?? 0,
    },
    makerId: d.makerId ? String(d.makerId) : null,
    checkerId: d.checkerId ? String(d.checkerId) : null,
    lockedAt: d.lockedAt ?? null,
    notes: d.notes,
    createdAt: d.createdAt,
  };
}

export function toPublicEntry(doc: Record<string, unknown>): PublicPayrollEntry {
  const d = doc as unknown as PayrollEntryDoc & { _id: unknown };
  return {
    id: String(d._id),
    employeeId: String(d.employeeId),
    employeeCode: d.employeeCode,
    employeeName: d.employeeName,
    earnings: d.earnings ?? [],
    deductions: d.deductions ?? [],
    gross: d.gross,
    totalDeductions: d.totalDeductions,
    net: d.net,
    pf: d.pf,
    esi: d.esi,
    pt: d.pt,
    tds: d.tds,
    lop: d.lop,
  };
}

export const payrollService = {
  async listRuns(ctx: AuthContext, query: ListQuery, filter: PayrollRunFilter) {
    const { rows, total } = await payrollRunRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublicRun(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async getRun(ctx: AuthContext, id: string) {
    const run = await payrollRunRepository.findById(ctx.companyId, id);
    if (!run) throw AppError.notFound('Payroll run not found');
    const entries = await payrollRunRepository.listEntries(ctx.companyId, id);
    return {
      run: toPublicRun(run as Record<string, unknown>),
      entries: entries.map((e) => toPublicEntry(e as Record<string, unknown>)),
    };
  },

  /** Run the engine and persist a Calculated run + its entries. */
  async calculate(ctx: AuthContext, input: PayrollRunCreateInput, meta?: AuditInput['meta']) {
    const { month, year } = input;

    if (await payrollRunRepository.lockedExists(ctx.companyId, month, year)) {
      throw AppError.conflict(`Payroll for ${MONTHS[month]} ${year} is locked and cannot be recalculated`);
    }

    const result = await runPayroll(ctx, { month, year });
    if (result.entries.length === 0) {
      throw AppError.badRequest('No employees with an active salary structure to process for this period');
    }

    // Reuse a Draft/Calculated run for the period if one exists; else create.
    const existing = await payrollRunRepository.findReusable(ctx.companyId, month, year);
    let runId: string;

    if (existing) {
      runId = String(existing._id);
      await payrollRunRepository.updateById(ctx.companyId, runId, {
        status: 'Calculated',
        totals: result.totals,
        makerId: ctx.userId as unknown as PayrollRunDoc['makerId'],
        checkerId: null,
        notes: input.notes,
        updatedBy: ctx.userId as unknown as PayrollRunDoc['updatedBy'],
      });
    } else {
      const created = await payrollRunRepository.create({
        companyId: ctx.companyId as unknown as PayrollRunDoc['companyId'],
        createdBy: ctx.userId as unknown as PayrollRunDoc['createdBy'],
        updatedBy: ctx.userId as unknown as PayrollRunDoc['updatedBy'],
        month,
        year,
        status: 'Calculated',
        totals: result.totals,
        makerId: ctx.userId as unknown as PayrollRunDoc['makerId'],
        notes: input.notes,
      });
      runId = String(created._id);
    }

    const entryDocs: Partial<PayrollEntryDoc>[] = result.entries.map((e) => ({
      companyId: ctx.companyId as unknown as PayrollEntryDoc['companyId'],
      createdBy: ctx.userId as unknown as PayrollEntryDoc['createdBy'],
      updatedBy: ctx.userId as unknown as PayrollEntryDoc['updatedBy'],
      runId: runId as unknown as PayrollEntryDoc['runId'],
      employeeId: e.employeeId as unknown as PayrollEntryDoc['employeeId'],
      employeeCode: e.employeeCode,
      employeeName: e.employeeName,
      earnings: e.earnings,
      deductions: e.deductions,
      gross: e.gross,
      totalDeductions: e.totalDeductions,
      net: e.net,
      pf: e.pf,
      esi: e.esi,
      pt: e.pt,
      tds: e.tds,
      lop: e.lop,
    }));
    await payrollRunRepository.replaceEntries(ctx.companyId, runId, entryDocs);

    await recordAudit(ctx, {
      action: 'create',
      module: 'payroll',
      entityId: runId,
      summary: `Calculated payroll for ${MONTHS[month]} ${year} — ${result.entries.length} employees, net ₹${result.totals.net}`,
      meta,
    });

    const detail = await this.getRun(ctx, runId);
    return { ...detail, skipped: result.skipped };
  },

  /** Calculated → Approved (checker). */
  async approve(ctx: AuthContext, id: string, notes?: string, meta?: AuditInput['meta']) {
    const run = await payrollRunRepository.findById(ctx.companyId, id);
    if (!run) throw AppError.notFound('Payroll run not found');
    if (run.status !== 'Calculated') {
      throw AppError.badRequest(`Only a Calculated run can be approved (current: ${run.status})`);
    }

    const updated = await payrollRunRepository.updateById(ctx.companyId, id, {
      status: 'Approved',
      checkerId: ctx.userId as unknown as PayrollRunDoc['checkerId'],
      ...(notes !== undefined && { notes }),
      updatedBy: ctx.userId as unknown as PayrollRunDoc['updatedBy'],
    });
    if (!updated) throw AppError.notFound('Payroll run not found');

    await recordAudit(ctx, {
      action: 'approve',
      module: 'payroll',
      entityId: id,
      summary: `Approved payroll for ${MONTHS[updated.month]} ${updated.year}`,
      meta,
    });

    return toPublicRun(updated as Record<string, unknown>);
  },

  /** Approved → Locked (immutable). */
  async lock(ctx: AuthContext, id: string, notes?: string, meta?: AuditInput['meta']) {
    const run = await payrollRunRepository.findById(ctx.companyId, id);
    if (!run) throw AppError.notFound('Payroll run not found');
    if (run.status !== 'Approved') {
      throw AppError.badRequest(`Only an Approved run can be locked (current: ${run.status})`);
    }

    const updated = await payrollRunRepository.updateById(ctx.companyId, id, {
      status: 'Locked',
      lockedAt: new Date(),
      ...(notes !== undefined && { notes }),
      updatedBy: ctx.userId as unknown as PayrollRunDoc['updatedBy'],
    });
    if (!updated) throw AppError.notFound('Payroll run not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'payroll',
      entityId: id,
      summary: `Locked payroll for ${MONTHS[updated.month]} ${updated.year}`,
      meta,
    });

    return toPublicRun(updated as Record<string, unknown>);
  },
};
