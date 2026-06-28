/**
 * Deduction domain logic. Thin CRUD over the repository with audit. Recurring
 * deductions apply every payroll cycle from `month`; one-offs apply only to it.
 */
import type { DeductionDoc } from '@/models/Deduction';
import {
  deductionRepository,
  type DeductionFilter,
} from '@/server/repositories/deduction.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type { DeductionCreateInput, DeductionUpdateInput } from '@/lib/validators/benefits';
import { toEmployeeRef, type EmployeeRef } from './benefits.shared';

export type PublicDeduction = {
  id: string;
  employee: EmployeeRef;
  name: string;
  amount: number;
  recurring: boolean;
  month: string;
  isActive: boolean;
  createdAt?: Date;
};

function toPublic(doc: Record<string, unknown>): PublicDeduction {
  const d = doc as unknown as DeductionDoc & { _id: unknown; createdAt?: Date };
  return {
    id: String(d._id),
    employee: toEmployeeRef(d.employeeId),
    name: d.name,
    amount: d.amount,
    recurring: d.recurring,
    month: d.month,
    isActive: d.isActive,
    createdAt: d.createdAt,
  };
}

export const deductionService = {
  async list(ctx: AuthContext, query: ListQuery, filter: DeductionFilter) {
    const { rows, total } = await deductionRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicDeduction> {
    const doc = await deductionRepository.findById(ctx.companyId, id, { populate: ['employeeId'] });
    if (!doc) throw AppError.notFound('Deduction not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: DeductionCreateInput, meta?: AuditInput['meta']) {
    const created = await deductionRepository.create({
      companyId: ctx.companyId as unknown as DeductionDoc['companyId'],
      createdBy: ctx.userId as unknown as DeductionDoc['createdBy'],
      updatedBy: ctx.userId as unknown as DeductionDoc['updatedBy'],
      employeeId: input.employeeId as unknown as DeductionDoc['employeeId'],
      name: input.name,
      amount: input.amount,
      recurring: input.recurring,
      month: input.month,
      isActive: input.isActive ?? true,
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'benefits',
      entityId: String(created._id),
      summary: `Added ${input.recurring ? 'recurring ' : ''}deduction ${input.name} (₹${input.amount})`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: DeductionUpdateInput, meta?: AuditInput['meta']) {
    const before = await deductionRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Deduction not found');

    const patch: Partial<DeductionDoc> = {
      updatedBy: ctx.userId as unknown as DeductionDoc['updatedBy'],
      ...(input.employeeId !== undefined && {
        employeeId: input.employeeId as unknown as DeductionDoc['employeeId'],
      }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.recurring !== undefined && { recurring: input.recurring }),
      ...(input.month !== undefined && { month: input.month }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };

    const updated = await deductionRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Deduction not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'benefits',
      entityId: id,
      summary: `Updated deduction ${updated.name}`,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await deductionRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Deduction not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'benefits',
      entityId: id,
      summary: `Deleted deduction ${removed.name}`,
      meta,
    });
    return { id };
  },
};
