/**
 * Loan domain logic. On create it derives the EMI and the full reducing-balance
 * repayment schedule (persisted as LoanRepayment rows) so payroll can recover
 * installments deterministically. Routes call this; this calls the repository.
 */
import type { LoanDoc } from '@/models/Loan';
import type { LoanRepaymentDoc } from '@/models/LoanRepayment';
import { loanRepository, type LoanFilter } from '@/server/repositories/loan.repository';
import { computeEmi, generateEmiSchedule, totalInterest } from '@/lib/benefits/emi';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type { LoanCreateInput, LoanUpdateInput } from '@/lib/validators/benefits';
import { toEmployeeRef, type EmployeeRef } from './benefits.shared';

export type PublicLoan = {
  id: string;
  employee: EmployeeRef;
  principal: number;
  interestRatePa: number;
  tenureMonths: number;
  emi: number;
  outstanding: number;
  totalInterest: number;
  startMonth: string;
  status: string;
  notes?: string;
  createdAt?: Date;
};

export type PublicRepayment = {
  id: string;
  monthIndex: number;
  emi: number;
  principalPart: number;
  interestPart: number;
  balance: number;
  paid: boolean;
};

function toPublic(doc: Record<string, unknown>): PublicLoan {
  const d = doc as unknown as LoanDoc & { _id: unknown; createdAt?: Date };
  return {
    id: String(d._id),
    employee: toEmployeeRef(d.employeeId),
    principal: d.principal,
    interestRatePa: d.interestRatePa,
    tenureMonths: d.tenureMonths,
    emi: d.emi,
    outstanding: d.outstanding,
    totalInterest: totalInterest(d.principal, d.interestRatePa, d.tenureMonths),
    startMonth: d.startMonth,
    status: d.status,
    notes: d.notes,
    createdAt: d.createdAt,
  };
}

function repaymentToPublic(doc: Record<string, unknown>): PublicRepayment {
  const d = doc as unknown as LoanRepaymentDoc & { _id: unknown };
  return {
    id: String(d._id),
    monthIndex: d.monthIndex,
    emi: d.emi,
    principalPart: d.principalPart,
    interestPart: d.interestPart,
    balance: d.balance,
    paid: d.paid,
  };
}

export const loanService = {
  async list(ctx: AuthContext, query: ListQuery, filter: LoanFilter) {
    const { rows, total } = await loanRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicLoan> {
    const doc = await loanRepository.findById(ctx.companyId, id, { populate: ['employeeId'] });
    if (!doc) throw AppError.notFound('Loan not found');
    return toPublic(doc as Record<string, unknown>);
  },

  /** Full amortization schedule for a loan. */
  async schedule(ctx: AuthContext, id: string): Promise<PublicRepayment[]> {
    const loan = await loanRepository.findById(ctx.companyId, id);
    if (!loan) throw AppError.notFound('Loan not found');
    const rows = await loanRepository.schedule(ctx.companyId, id);
    return rows.map((r) => repaymentToPublic(r as Record<string, unknown>));
  },

  async create(ctx: AuthContext, input: LoanCreateInput, meta?: AuditInput['meta']) {
    const emi = computeEmi(input.principal, input.interestRatePa, input.tenureMonths);
    if (emi <= 0) throw AppError.badRequest('Could not compute EMI for the given terms');

    const created = await loanRepository.create({
      companyId: ctx.companyId as unknown as LoanDoc['companyId'],
      createdBy: ctx.userId as unknown as LoanDoc['createdBy'],
      updatedBy: ctx.userId as unknown as LoanDoc['updatedBy'],
      employeeId: input.employeeId as unknown as LoanDoc['employeeId'],
      principal: input.principal,
      interestRatePa: input.interestRatePa,
      tenureMonths: input.tenureMonths,
      emi,
      outstanding: input.principal,
      startMonth: input.startMonth,
      status: 'Active',
      notes: input.notes,
    });

    // Materialize the reducing-balance schedule alongside the loan.
    const schedule = generateEmiSchedule(input.principal, input.interestRatePa, input.tenureMonths);
    await loanRepository.insertSchedule(
      schedule.map((row) => ({
        companyId: created.companyId,
        createdBy: ctx.userId as unknown as LoanRepaymentDoc['createdBy'],
        loanId: created._id as unknown as LoanRepaymentDoc['loanId'],
        monthIndex: row.monthIndex,
        emi: row.emi,
        principalPart: row.principalPart,
        interestPart: row.interestPart,
        balance: row.balance,
        paid: false,
      })),
    );

    await recordAudit(ctx, {
      action: 'create',
      module: 'benefits',
      entityId: String(created._id),
      summary: `Created loan of ₹${input.principal} (${input.tenureMonths} mo, EMI ₹${emi})`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  /** Limited updates — status (close) and notes. Terms are immutable post-create. */
  async update(ctx: AuthContext, id: string, input: LoanUpdateInput, meta?: AuditInput['meta']) {
    const before = await loanRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Loan not found');

    const patch: Partial<LoanDoc> = { updatedBy: ctx.userId as unknown as LoanDoc['updatedBy'] };
    if (input.status !== undefined) patch.status = input.status;
    if (input.notes !== undefined) patch.notes = input.notes;

    const updated = await loanRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Loan not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'benefits',
      entityId: id,
      summary: `Updated loan ${id}${input.status ? ` → ${input.status}` : ''}`,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await loanRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Loan not found');
    await loanRepository.deleteSchedule(ctx.companyId, id);
    await recordAudit(ctx, {
      action: 'delete',
      module: 'benefits',
      entityId: id,
      summary: `Deleted loan ${id}`,
      meta,
    });
    return { id };
  },
};
