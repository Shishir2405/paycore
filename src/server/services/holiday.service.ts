/**
 * Holiday domain logic: tenant scoping, audit trail. Route handlers call this;
 * this layer calls the repository.
 */
import type { HolidayDoc } from '@/models/Holiday';
import { holidayRepository, type HolidayFilter } from '@/server/repositories/holiday.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type { HolidayCreateInput, HolidayUpdateInput } from '@/lib/validators/holiday';

export type PublicHoliday = {
  id: string;
  name: string;
  date: Date;
  type: string;
  state?: string;
  location?: string;
};

function toPublic(doc: Record<string, unknown>): PublicHoliday {
  const d = doc as unknown as HolidayDoc & { _id: unknown };
  return {
    id: String(d._id),
    name: d.name,
    date: d.date,
    type: d.type,
    state: d.state,
    location: d.location,
  };
}

export const holidayService = {
  async list(ctx: AuthContext, query: ListQuery, filter: HolidayFilter) {
    const { rows, total } = await holidayRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicHoliday> {
    const doc = await holidayRepository.findById(ctx.companyId, id);
    if (!doc) throw AppError.notFound('Holiday not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: HolidayCreateInput, meta?: AuditInput['meta']) {
    if (await holidayRepository.exists(ctx.companyId, { name: input.name, date: input.date })) {
      throw AppError.conflict(`Holiday "${input.name}" already exists on that date`);
    }
    const created = await holidayRepository.create({
      companyId: ctx.companyId as unknown as HolidayDoc['companyId'],
      createdBy: ctx.userId as unknown as HolidayDoc['createdBy'],
      updatedBy: ctx.userId as unknown as HolidayDoc['updatedBy'],
      name: input.name,
      date: input.date,
      type: input.type,
      state: input.state,
      location: input.location,
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'attendance',
      entityId: String(created._id),
      summary: `Created holiday ${created.name}`,
      meta,
    });
    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: HolidayUpdateInput, meta?: AuditInput['meta']) {
    const before = await holidayRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Holiday not found');

    const patch: Partial<HolidayDoc> = {
      updatedBy: ctx.userId as unknown as HolidayDoc['updatedBy'],
      ...(input.name !== undefined && { name: input.name }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.state !== undefined && { state: input.state }),
      ...(input.location !== undefined && { location: input.location }),
    };

    const updated = await holidayRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Holiday not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'attendance',
      entityId: id,
      summary: `Updated holiday ${updated.name}`,
      meta,
    });
    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await holidayRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Holiday not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'attendance',
      entityId: id,
      summary: `Deleted holiday ${removed.name}`,
      meta,
    });
    return { id };
  },
};
