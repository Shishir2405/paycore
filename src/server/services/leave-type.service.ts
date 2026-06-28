/**
 * Leave type domain logic: tenant scoping, audit trail, public mapping.
 * Routes call this; this layer calls the repository — never Mongoose directly.
 */
import type { LeaveTypeDoc } from '@/models/LeaveType';
import {
  leaveTypeRepository,
  type LeaveTypeFilter,
} from '@/server/repositories/leave-type.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type { LeaveTypeCreateInput, LeaveTypeUpdateInput } from '@/lib/validators/leave';

export type PublicLeaveType = {
  id: string;
  name: string;
  code: string;
  description?: string;
  annualQuota: number;
  paid: boolean;
  carryForward: boolean;
  maxCarryForward: number;
  isActive: boolean;
};

function toPublic(doc: Record<string, unknown>): PublicLeaveType {
  const d = doc as unknown as LeaveTypeDoc & { _id: unknown };
  return {
    id: String(d._id),
    name: d.name,
    code: d.code,
    description: d.description,
    annualQuota: d.annualQuota,
    paid: d.paid,
    carryForward: d.carryForward,
    maxCarryForward: d.maxCarryForward,
    isActive: d.isActive,
  };
}

export const leaveTypeService = {
  async list(ctx: AuthContext, query: ListQuery, filter: LeaveTypeFilter) {
    const { rows, total } = await leaveTypeRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicLeaveType> {
    const doc = await leaveTypeRepository.findById(ctx.companyId, id);
    if (!doc) throw AppError.notFound('Leave type not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: LeaveTypeCreateInput, meta?: AuditInput['meta']) {
    if (await leaveTypeRepository.exists(ctx.companyId, { code: input.code })) {
      throw AppError.conflict(`Leave type code ${input.code} already exists`);
    }

    const created = await leaveTypeRepository.create({
      companyId: ctx.companyId as unknown as LeaveTypeDoc['companyId'],
      createdBy: ctx.userId as unknown as LeaveTypeDoc['createdBy'],
      updatedBy: ctx.userId as unknown as LeaveTypeDoc['updatedBy'],
      name: input.name,
      code: input.code,
      description: input.description,
      annualQuota: input.annualQuota,
      paid: input.paid,
      carryForward: input.carryForward,
      maxCarryForward: input.maxCarryForward,
      isActive: input.isActive,
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'leave',
      entityId: String(created._id),
      summary: `Created leave type ${input.code}`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: LeaveTypeUpdateInput, meta?: AuditInput['meta']) {
    const before = await leaveTypeRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Leave type not found');

    if (input.code && input.code !== before.code) {
      if (await leaveTypeRepository.exists(ctx.companyId, { code: input.code })) {
        throw AppError.conflict(`Leave type code ${input.code} already exists`);
      }
    }

    const patch: Partial<LeaveTypeDoc> = {
      updatedBy: ctx.userId as unknown as LeaveTypeDoc['updatedBy'],
      ...(input.name !== undefined && { name: input.name }),
      ...(input.code !== undefined && { code: input.code }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.annualQuota !== undefined && { annualQuota: input.annualQuota }),
      ...(input.paid !== undefined && { paid: input.paid }),
      ...(input.carryForward !== undefined && { carryForward: input.carryForward }),
      ...(input.maxCarryForward !== undefined && { maxCarryForward: input.maxCarryForward }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };

    const updated = await leaveTypeRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Leave type not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'leave',
      entityId: id,
      summary: `Updated leave type ${updated.code}`,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await leaveTypeRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Leave type not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'leave',
      entityId: id,
      summary: `Deleted leave type ${removed.code}`,
      meta,
    });
    return { id };
  },
};
