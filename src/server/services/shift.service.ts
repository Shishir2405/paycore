/**
 * Shift domain logic: tenant scoping, unique-code enforcement, audit trail.
 * Route handlers call this; this layer calls the repository.
 */
import type { ShiftDoc } from '@/models/Shift';
import { shiftRepository, type ShiftFilter } from '@/server/repositories/shift.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type { ShiftCreateInput, ShiftUpdateInput } from '@/lib/validators/shift';

export type PublicShift = {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  weeklyOffDays: number[];
  isActive: boolean;
};

function toPublic(doc: Record<string, unknown>): PublicShift {
  const d = doc as unknown as ShiftDoc & { _id: unknown };
  return {
    id: String(d._id),
    name: d.name,
    code: d.code,
    startTime: d.startTime,
    endTime: d.endTime,
    breakMinutes: d.breakMinutes,
    weeklyOffDays: d.weeklyOffDays ?? [],
    isActive: d.isActive,
  };
}

export const shiftService = {
  async list(ctx: AuthContext, query: ListQuery, filter: ShiftFilter) {
    const { rows, total } = await shiftRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicShift> {
    const doc = await shiftRepository.findById(ctx.companyId, id);
    if (!doc) throw AppError.notFound('Shift not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: ShiftCreateInput, meta?: AuditInput['meta']) {
    if (await shiftRepository.exists(ctx.companyId, { code: input.code })) {
      throw AppError.conflict(`Shift code ${input.code} already exists`);
    }
    const created = await shiftRepository.create({
      companyId: ctx.companyId as unknown as ShiftDoc['companyId'],
      createdBy: ctx.userId as unknown as ShiftDoc['createdBy'],
      updatedBy: ctx.userId as unknown as ShiftDoc['updatedBy'],
      name: input.name,
      code: input.code,
      startTime: input.startTime,
      endTime: input.endTime,
      breakMinutes: input.breakMinutes,
      weeklyOffDays: input.weeklyOffDays,
      isActive: input.isActive ?? true,
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'attendance',
      entityId: String(created._id),
      summary: `Created shift ${created.code}`,
      meta,
    });
    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: ShiftUpdateInput, meta?: AuditInput['meta']) {
    const before = await shiftRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Shift not found');

    if (input.code && input.code !== before.code) {
      if (await shiftRepository.exists(ctx.companyId, { code: input.code })) {
        throw AppError.conflict(`Shift code ${input.code} already exists`);
      }
    }

    const patch: Partial<ShiftDoc> = {
      updatedBy: ctx.userId as unknown as ShiftDoc['updatedBy'],
      ...(input.name !== undefined && { name: input.name }),
      ...(input.code !== undefined && { code: input.code }),
      ...(input.startTime !== undefined && { startTime: input.startTime }),
      ...(input.endTime !== undefined && { endTime: input.endTime }),
      ...(input.breakMinutes !== undefined && { breakMinutes: input.breakMinutes }),
      ...(input.weeklyOffDays !== undefined && { weeklyOffDays: input.weeklyOffDays }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };

    const updated = await shiftRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Shift not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'attendance',
      entityId: id,
      summary: `Updated shift ${updated.code}`,
      meta,
    });
    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await shiftRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Shift not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'attendance',
      entityId: id,
      summary: `Deleted shift ${removed.code}`,
      meta,
    });
    return { id };
  },
};
