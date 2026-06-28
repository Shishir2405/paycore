/**
 * Salary structure domain logic. Creating a structure for an employee bumps the
 * version and deactivates any prior active row, so history stays intact and the
 * engine always reads exactly one active structure per employee.
 */
import type { SalaryStructureDoc, StructureHead } from '@/models/SalaryStructure';
import {
  salaryStructureRepository,
  type SalaryStructureFilter,
} from '@/server/repositories/salary-structure.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import { money2, toEmployeeRef, type EmployeeRef } from './benefits.shared';
import type { AuthContext } from '@/types';
import type {
  SalaryStructureCreateInput,
  SalaryStructureUpdateInput,
  SalaryStructureHeadInput,
} from '@/lib/validators/payroll';

export type PublicSalaryStructure = {
  id: string;
  employee: EmployeeRef;
  effectiveFrom: Date;
  version: number;
  isActive: boolean;
  basic: number;
  heads: { payHeadId?: string | null; code: string; name: string; type: string; amount: number }[];
  gross: number;
  ctc: number;
  createdAt?: Date;
};

function toPublic(doc: Record<string, unknown>): PublicSalaryStructure {
  const d = doc as unknown as SalaryStructureDoc & { _id: unknown; createdAt?: Date };
  return {
    id: String(d._id),
    employee: toEmployeeRef(d.employeeId),
    effectiveFrom: d.effectiveFrom,
    version: d.version,
    isActive: d.isActive,
    basic: d.basic,
    heads: (d.heads ?? []).map((h) => ({
      payHeadId: h.payHeadId ? String(h.payHeadId) : null,
      code: h.code,
      name: h.name,
      type: h.type,
      amount: h.amount,
    })),
    gross: d.gross,
    ctc: d.ctc,
    createdAt: d.createdAt,
  };
}

/** Map validated heads onto persisted shape + roll up gross (earnings only). */
function buildHeads(input: SalaryStructureHeadInput[]): { heads: StructureHead[]; gross: number } {
  const heads: StructureHead[] = input.map((h) => ({
    payHeadId: (h.payHeadId || null) as StructureHead['payHeadId'],
    code: h.code,
    name: h.name,
    type: h.type,
    amount: money2(h.amount),
  }));
  const gross = money2(heads.filter((h) => h.type === 'Earning').reduce((s, h) => s + h.amount, 0));
  return { heads, gross };
}

export const salaryStructureService = {
  async list(ctx: AuthContext, query: ListQuery, filter: SalaryStructureFilter) {
    const { rows, total } = await salaryStructureRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicSalaryStructure> {
    const doc = await salaryStructureRepository.findById(ctx.companyId, id, { populate: ['employeeId'] });
    if (!doc) throw AppError.notFound('Salary structure not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: SalaryStructureCreateInput, meta?: AuditInput['meta']) {
    const { heads, gross } = buildHeads(input.heads);
    const version = (await salaryStructureRepository.latestVersion(ctx.companyId, input.employeeId)) + 1;

    // New active version supersedes the prior one.
    await salaryStructureRepository.deactivateAll(ctx.companyId, input.employeeId, ctx.userId);

    const created = await salaryStructureRepository.create({
      companyId: ctx.companyId as unknown as SalaryStructureDoc['companyId'],
      createdBy: ctx.userId as unknown as SalaryStructureDoc['createdBy'],
      updatedBy: ctx.userId as unknown as SalaryStructureDoc['updatedBy'],
      employeeId: input.employeeId as unknown as SalaryStructureDoc['employeeId'],
      effectiveFrom: input.effectiveFrom,
      version,
      isActive: true,
      basic: money2(input.basic),
      heads,
      gross,
      ctc: money2(gross * 12),
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'payroll',
      entityId: String(created._id),
      summary: `Created salary structure v${version} (gross ₹${gross})`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: SalaryStructureUpdateInput, meta?: AuditInput['meta']) {
    const before = await salaryStructureRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Salary structure not found');

    const patch: Partial<SalaryStructureDoc> = {
      updatedBy: ctx.userId as unknown as SalaryStructureDoc['updatedBy'],
      ...(input.effectiveFrom !== undefined && { effectiveFrom: input.effectiveFrom }),
      ...(input.basic !== undefined && { basic: money2(input.basic) }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };

    if (input.heads !== undefined) {
      const { heads, gross } = buildHeads(input.heads);
      patch.heads = heads;
      patch.gross = gross;
      patch.ctc = money2(gross * 12);
    }

    const updated = await salaryStructureRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Salary structure not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'payroll',
      entityId: id,
      summary: `Updated salary structure v${updated.version}`,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await salaryStructureRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Salary structure not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'payroll',
      entityId: id,
      summary: `Deleted salary structure v${removed.version}`,
      meta,
    });
    return { id };
  },
};
