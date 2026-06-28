/**
 * Statutory Compliance domain logic: the compliance calendar (ComplianceItem),
 * the PT slab + LWF rule configuration, and a combined PF/ESI/PT/LWF calculator
 * that the payroll engine can also drive via the same pure functions.
 */
import type { ComplianceItemDoc } from '@/models/ComplianceItem';
import type { PTSlabDoc } from '@/models/PTSlab';
import type { LWFRuleDoc } from '@/models/LWFRule';
import {
  complianceItemRepository,
  type ComplianceItemFilter,
} from '@/server/repositories/compliance-item.repository';
import { ptSlabRepository, type PtSlabFilter } from '@/server/repositories/pt-slab.repository';
import { lwfRuleRepository, type LwfRuleFilter } from '@/server/repositories/lwf-rule.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import {
  computePf,
  computeEsi,
  computePt,
  computeLwf,
  type PtSlabRow,
  type LwfRuleInput,
} from '@/lib/statutory';
import type {
  ComplianceItemCreateInput,
  ComplianceItemUpdateInput,
  PtSlabCreateInput,
  PtSlabUpdateInput,
  LwfRuleCreateInput,
  LwfRuleUpdateInput,
  CalculateInput,
} from '@/lib/validators/compliance';

const MODULE = 'compliance';

// ─── Public mappers ─────────────────────────────────────────────────────────
export type PublicComplianceItem = {
  id: string;
  type: string;
  period: string;
  dueDate: Date;
  status: string;
  amount: number;
  reference?: string;
  filedDate?: Date | null;
  notes?: string;
};

export type PublicPtSlab = {
  id: string;
  stateCode: string;
  fromAmount: number;
  toAmount: number | null;
  amount: number;
  frequency: string;
  month: number | null;
  isActive: boolean;
};

export type PublicLwfRule = {
  id: string;
  stateCode: string;
  employeeAmount: number;
  employerAmount: number;
  frequency: string;
  deductionMonths: number[];
  isActive: boolean;
};

function itemToPublic(doc: Record<string, unknown>): PublicComplianceItem {
  const d = doc as unknown as ComplianceItemDoc & { _id: unknown };
  return {
    id: String(d._id),
    type: d.type,
    period: d.period,
    dueDate: d.dueDate,
    status: d.status,
    amount: d.amount,
    reference: d.reference,
    filedDate: d.filedDate ?? null,
    notes: d.notes,
  };
}

function slabToPublic(doc: Record<string, unknown>): PublicPtSlab {
  const d = doc as unknown as PTSlabDoc & { _id: unknown };
  return {
    id: String(d._id),
    stateCode: d.stateCode,
    fromAmount: d.fromAmount,
    toAmount: d.toAmount ?? null,
    amount: d.amount,
    frequency: d.frequency,
    month: d.month ?? null,
    isActive: d.isActive,
  };
}

function lwfToPublic(doc: Record<string, unknown>): PublicLwfRule {
  const d = doc as unknown as LWFRuleDoc & { _id: unknown };
  return {
    id: String(d._id),
    stateCode: d.stateCode,
    employeeAmount: d.employeeAmount,
    employerAmount: d.employerAmount,
    frequency: d.frequency,
    deductionMonths: d.deductionMonths ?? [],
    isActive: d.isActive,
  };
}

/** Recompute Pending/Overdue from the due date; never override a Filed item. */
function deriveStatus(item: PublicComplianceItem): PublicComplianceItem {
  if (item.status === 'Filed') return item;
  const overdue = new Date(item.dueDate).getTime() < Date.now();
  return { ...item, status: overdue ? 'Overdue' : 'Pending' };
}

export const complianceService = {
  // ── Compliance calendar items ─────────────────────────────────────────────
  async listItems(ctx: AuthContext, query: ListQuery, filter: ComplianceItemFilter) {
    const { rows, total } = await complianceItemRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => deriveStatus(itemToPublic(r as Record<string, unknown>))),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async getItem(ctx: AuthContext, id: string): Promise<PublicComplianceItem> {
    const doc = await complianceItemRepository.findById(ctx.companyId, id);
    if (!doc) throw AppError.notFound('Compliance item not found');
    return deriveStatus(itemToPublic(doc as Record<string, unknown>));
  },

  async createItem(ctx: AuthContext, input: ComplianceItemCreateInput, meta?: AuditInput['meta']) {
    if (await complianceItemRepository.exists(ctx.companyId, { type: input.type, period: input.period })) {
      throw AppError.conflict(`A ${input.type} item for ${input.period} already exists`);
    }
    const created = await complianceItemRepository.create({
      companyId: ctx.companyId as unknown as ComplianceItemDoc['companyId'],
      createdBy: ctx.userId as unknown as ComplianceItemDoc['createdBy'],
      updatedBy: ctx.userId as unknown as ComplianceItemDoc['updatedBy'],
      type: input.type,
      period: input.period,
      dueDate: input.dueDate,
      status: input.status ?? 'Pending',
      amount: input.amount ?? 0,
      reference: input.reference,
      filedDate: input.filedDate ?? null,
      notes: input.notes,
    });
    await recordAudit(ctx, {
      action: 'create',
      module: MODULE,
      entityId: String(created._id),
      summary: `Created ${input.type} compliance item for ${input.period}`,
      meta,
    });
    return itemToPublic(created as Record<string, unknown>);
  },

  async updateItem(
    ctx: AuthContext,
    id: string,
    input: ComplianceItemUpdateInput,
    meta?: AuditInput['meta'],
  ) {
    const before = await complianceItemRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Compliance item not found');

    const patch: Partial<ComplianceItemDoc> = {
      updatedBy: ctx.userId as unknown as ComplianceItemDoc['updatedBy'],
      ...(input.type !== undefined && { type: input.type }),
      ...(input.period !== undefined && { period: input.period }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.reference !== undefined && { reference: input.reference }),
      ...(input.filedDate !== undefined && { filedDate: input.filedDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    // Stamp the filing date automatically when marked Filed without one.
    if (input.status === 'Filed' && input.filedDate === undefined && !before.filedDate) {
      patch.filedDate = new Date();
    }

    const updated = await complianceItemRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Compliance item not found');
    await recordAudit(ctx, {
      action: 'update',
      module: MODULE,
      entityId: id,
      summary: `Updated ${updated.type} compliance item for ${updated.period}`,
      meta,
    });
    return itemToPublic(updated as Record<string, unknown>);
  },

  async removeItem(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await complianceItemRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Compliance item not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: MODULE,
      entityId: id,
      summary: `Deleted ${removed.type} compliance item for ${removed.period}`,
      meta,
    });
    return { id };
  },

  // ── PT slabs ──────────────────────────────────────────────────────────────
  async listPtSlabs(ctx: AuthContext, query: ListQuery, filter: PtSlabFilter) {
    const { rows, total } = await ptSlabRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => slabToPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async createPtSlab(ctx: AuthContext, input: PtSlabCreateInput, meta?: AuditInput['meta']) {
    const created = await ptSlabRepository.create({
      companyId: ctx.companyId as unknown as PTSlabDoc['companyId'],
      createdBy: ctx.userId as unknown as PTSlabDoc['createdBy'],
      updatedBy: ctx.userId as unknown as PTSlabDoc['updatedBy'],
      stateCode: input.stateCode,
      fromAmount: input.fromAmount,
      toAmount: input.toAmount ?? null,
      amount: input.amount,
      frequency: input.frequency ?? 'Monthly',
      month: input.month ?? null,
      isActive: input.isActive ?? true,
    });
    await recordAudit(ctx, {
      action: 'create',
      module: MODULE,
      entityId: String(created._id),
      summary: `Created PT slab for ${input.stateCode}`,
      meta,
    });
    return slabToPublic(created as Record<string, unknown>);
  },

  async updatePtSlab(ctx: AuthContext, id: string, input: PtSlabUpdateInput, meta?: AuditInput['meta']) {
    const patch: Partial<PTSlabDoc> = {
      updatedBy: ctx.userId as unknown as PTSlabDoc['updatedBy'],
      ...(input.stateCode !== undefined && { stateCode: input.stateCode }),
      ...(input.fromAmount !== undefined && { fromAmount: input.fromAmount }),
      ...(input.toAmount !== undefined && { toAmount: input.toAmount }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.month !== undefined && { month: input.month }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };
    const updated = await ptSlabRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('PT slab not found');
    await recordAudit(ctx, {
      action: 'update',
      module: MODULE,
      entityId: id,
      summary: `Updated PT slab for ${updated.stateCode}`,
      meta,
    });
    return slabToPublic(updated as Record<string, unknown>);
  },

  async removePtSlab(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await ptSlabRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('PT slab not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: MODULE,
      entityId: id,
      summary: `Deleted PT slab for ${removed.stateCode}`,
      meta,
    });
    return { id };
  },

  // ── LWF rules ─────────────────────────────────────────────────────────────
  async listLwfRules(ctx: AuthContext, query: ListQuery, filter: LwfRuleFilter) {
    const { rows, total } = await lwfRuleRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => lwfToPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async createLwfRule(ctx: AuthContext, input: LwfRuleCreateInput, meta?: AuditInput['meta']) {
    if (await lwfRuleRepository.exists(ctx.companyId, { stateCode: input.stateCode })) {
      throw AppError.conflict(`An LWF rule for ${input.stateCode} already exists`);
    }
    const created = await lwfRuleRepository.create({
      companyId: ctx.companyId as unknown as LWFRuleDoc['companyId'],
      createdBy: ctx.userId as unknown as LWFRuleDoc['createdBy'],
      updatedBy: ctx.userId as unknown as LWFRuleDoc['updatedBy'],
      stateCode: input.stateCode,
      employeeAmount: input.employeeAmount,
      employerAmount: input.employerAmount,
      frequency: input.frequency ?? 'HalfYearly',
      deductionMonths: input.deductionMonths ?? [6, 12],
      isActive: input.isActive ?? true,
    });
    await recordAudit(ctx, {
      action: 'create',
      module: MODULE,
      entityId: String(created._id),
      summary: `Created LWF rule for ${input.stateCode}`,
      meta,
    });
    return lwfToPublic(created as Record<string, unknown>);
  },

  async updateLwfRule(ctx: AuthContext, id: string, input: LwfRuleUpdateInput, meta?: AuditInput['meta']) {
    const patch: Partial<LWFRuleDoc> = {
      updatedBy: ctx.userId as unknown as LWFRuleDoc['updatedBy'],
      ...(input.stateCode !== undefined && { stateCode: input.stateCode }),
      ...(input.employeeAmount !== undefined && { employeeAmount: input.employeeAmount }),
      ...(input.employerAmount !== undefined && { employerAmount: input.employerAmount }),
      ...(input.frequency !== undefined && { frequency: input.frequency }),
      ...(input.deductionMonths !== undefined && { deductionMonths: input.deductionMonths }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };
    const updated = await lwfRuleRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('LWF rule not found');
    await recordAudit(ctx, {
      action: 'update',
      module: MODULE,
      entityId: id,
      summary: `Updated LWF rule for ${updated.stateCode}`,
      meta,
    });
    return lwfToPublic(updated as Record<string, unknown>);
  },

  async removeLwfRule(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await lwfRuleRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('LWF rule not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: MODULE,
      entityId: id,
      summary: `Deleted LWF rule for ${removed.stateCode}`,
      meta,
    });
    return { id };
  },

  // ── Combined statutory calculator ─────────────────────────────────────────
  async calculate(ctx: AuthContext, input: CalculateInput) {
    const [slabRows, lwfRule] = await Promise.all([
      ptSlabRepository.forState(ctx.companyId, input.stateCode),
      lwfRuleRepository.forState(ctx.companyId, input.stateCode),
    ]);

    const ptSlabs: PtSlabRow[] = slabRows.map((s) => ({
      stateCode: s.stateCode,
      fromAmount: s.fromAmount,
      toAmount: s.toAmount ?? null,
      amount: s.amount,
      frequency: s.frequency,
      month: s.month ?? undefined,
    }));

    const lwfInput: LwfRuleInput | null = lwfRule
      ? {
          stateCode: lwfRule.stateCode,
          employeeAmount: lwfRule.employeeAmount,
          employerAmount: lwfRule.employerAmount,
          frequency: lwfRule.frequency,
          deductionMonths: lwfRule.deductionMonths,
        }
      : null;

    const pf = computePf(input.basic, { capContribution: input.capPfContribution });
    const esi = computeEsi(input.gross);
    const pt = computePt(input.gross, input.stateCode, ptSlabs, input.month);
    const lwf = computeLwf(input.stateCode, lwfInput, input.month);

    const employeeTotal = pf.employee + esi.employee + pt.amount + lwf.employee;
    const employerTotal = pf.employer + esi.employer + lwf.employer;

    return {
      input,
      pf,
      esi,
      pt,
      lwf,
      totals: {
        employee: employeeTotal,
        employer: employerTotal,
        ctcImpact: employerTotal,
      },
    };
  },
};
