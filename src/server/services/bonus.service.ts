/**
 * Bonus domain logic — thin CRUD over the repository with audit. A bonus is a
 * one-off statutory or discretionary payout tagged to a disbursement month.
 */
import type { BonusDoc } from '@/models/Bonus';
import { bonusRepository, type BonusFilter } from '@/server/repositories/bonus.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import { money2, toEmployeeRef, type EmployeeRef } from './benefits.shared';
import type { AuthContext } from '@/types';
import type { BonusCreateInput, BonusUpdateInput } from '@/lib/validators/payroll';

export type PublicBonus = {
  id: string;
  employee: EmployeeRef;
  type: string;
  amount: number;
  month: number;
  year: number;
  notes?: string;
  createdAt?: Date;
};

function toPublic(doc: Record<string, unknown>): PublicBonus {
  const d = doc as unknown as BonusDoc & { _id: unknown; createdAt?: Date };
  return {
    id: String(d._id),
    employee: toEmployeeRef(d.employeeId),
    type: d.type,
    amount: d.amount,
    month: d.month,
    year: d.year,
    notes: d.notes,
    createdAt: d.createdAt,
  };
}

export const bonusService = {
  async list(ctx: AuthContext, query: ListQuery, filter: BonusFilter) {
    const { rows, total } = await bonusRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicBonus> {
    const doc = await bonusRepository.findById(ctx.companyId, id, { populate: ['employeeId'] });
    if (!doc) throw AppError.notFound('Bonus not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: BonusCreateInput, meta?: AuditInput['meta']) {
    const created = await bonusRepository.create({
      companyId: ctx.companyId as unknown as BonusDoc['companyId'],
      createdBy: ctx.userId as unknown as BonusDoc['createdBy'],
      updatedBy: ctx.userId as unknown as BonusDoc['updatedBy'],
      employeeId: input.employeeId as unknown as BonusDoc['employeeId'],
      type: input.type,
      amount: money2(input.amount),
      month: input.month,
      year: input.year,
      notes: input.notes,
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'payroll',
      entityId: String(created._id),
      summary: `Added ${input.type} bonus ₹${input.amount} for ${input.month}/${input.year}`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: BonusUpdateInput, meta?: AuditInput['meta']) {
    const before = await bonusRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Bonus not found');

    const updated = await bonusRepository.updateById(ctx.companyId, id, {
      updatedBy: ctx.userId as unknown as BonusDoc['updatedBy'],
      ...(input.employeeId !== undefined && {
        employeeId: input.employeeId as unknown as BonusDoc['employeeId'],
      }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: money2(input.amount) }),
      ...(input.month !== undefined && { month: input.month }),
      ...(input.year !== undefined && { year: input.year }),
      ...(input.notes !== undefined && { notes: input.notes }),
    });
    if (!updated) throw AppError.notFound('Bonus not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'payroll',
      entityId: id,
      summary: `Updated bonus ₹${updated.amount}`,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await bonusRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Bonus not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'payroll',
      entityId: id,
      summary: `Deleted bonus ₹${removed.amount}`,
      meta,
    });
    return { id };
  },
};
