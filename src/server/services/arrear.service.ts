/**
 * Arrear domain logic — thin CRUD over the repository with audit. An arrear is a
 * back-dated amount picked up by a future payroll cycle and marked Processed.
 */
import type { ArrearDoc } from '@/models/Arrear';
import { arrearRepository, type ArrearFilter } from '@/server/repositories/arrear.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import { money2, toEmployeeRef, type EmployeeRef } from './benefits.shared';
import type { AuthContext } from '@/types';
import type { ArrearCreateInput, ArrearUpdateInput } from '@/lib/validators/payroll';

export type PublicArrear = {
  id: string;
  employee: EmployeeRef;
  month: number;
  year: number;
  amount: number;
  reason: string;
  status: string;
  createdAt?: Date;
};

function toPublic(doc: Record<string, unknown>): PublicArrear {
  const d = doc as unknown as ArrearDoc & { _id: unknown; createdAt?: Date };
  return {
    id: String(d._id),
    employee: toEmployeeRef(d.employeeId),
    month: d.month,
    year: d.year,
    amount: d.amount,
    reason: d.reason,
    status: d.status,
    createdAt: d.createdAt,
  };
}

export const arrearService = {
  async list(ctx: AuthContext, query: ListQuery, filter: ArrearFilter) {
    const { rows, total } = await arrearRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicArrear> {
    const doc = await arrearRepository.findById(ctx.companyId, id, { populate: ['employeeId'] });
    if (!doc) throw AppError.notFound('Arrear not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: ArrearCreateInput, meta?: AuditInput['meta']) {
    const created = await arrearRepository.create({
      companyId: ctx.companyId as unknown as ArrearDoc['companyId'],
      createdBy: ctx.userId as unknown as ArrearDoc['createdBy'],
      updatedBy: ctx.userId as unknown as ArrearDoc['updatedBy'],
      employeeId: input.employeeId as unknown as ArrearDoc['employeeId'],
      month: input.month,
      year: input.year,
      amount: money2(input.amount),
      reason: input.reason,
      status: input.status ?? 'Pending',
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'payroll',
      entityId: String(created._id),
      summary: `Added arrear ₹${input.amount} for ${input.month}/${input.year}`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: ArrearUpdateInput, meta?: AuditInput['meta']) {
    const before = await arrearRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Arrear not found');

    const updated = await arrearRepository.updateById(ctx.companyId, id, {
      updatedBy: ctx.userId as unknown as ArrearDoc['updatedBy'],
      ...(input.employeeId !== undefined && {
        employeeId: input.employeeId as unknown as ArrearDoc['employeeId'],
      }),
      ...(input.month !== undefined && { month: input.month }),
      ...(input.year !== undefined && { year: input.year }),
      ...(input.amount !== undefined && { amount: money2(input.amount) }),
      ...(input.reason !== undefined && { reason: input.reason }),
      ...(input.status !== undefined && { status: input.status }),
    });
    if (!updated) throw AppError.notFound('Arrear not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'payroll',
      entityId: id,
      summary: `Updated arrear ₹${updated.amount}`,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await arrearRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Arrear not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'payroll',
      entityId: id,
      summary: `Deleted arrear ₹${removed.amount}`,
      meta,
    });
    return { id };
  },
};
