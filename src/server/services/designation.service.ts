/**
 * Designation domain logic: tenant scoping, audit trail, and a public mapper.
 * Route handlers call this; this layer calls the repository — never Mongoose
 * directly.
 */
import type { DesignationDoc } from '@/models/Designation';
import {
  designationRepository,
  type DesignationFilter,
} from '@/server/repositories/designation.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { computeDiff } from '@/lib/audit/diff';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta } from '@/lib/utils/pagination';
import type { ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type { DesignationCreateInput, DesignationUpdateInput } from '@/lib/validators/designation';

/** Plain JSON representation returned by the API (string ids). */
export type PublicDesignation = {
  id: string;
  name: string;
  code: string;
  description?: string;
  grade?: string;
  band?: string;
  level: number;
  ctcRange?: { min?: number; max?: number };
  isActive: boolean;
  createdAt?: Date;
};

function toPublic(doc: Record<string, unknown>): PublicDesignation {
  const d = doc as unknown as DesignationDoc & { _id: unknown };
  return {
    id: String(d._id),
    name: d.name,
    code: d.code,
    description: d.description,
    grade: d.grade,
    band: d.band,
    level: d.level ?? 0,
    ctcRange: d.ctcRange ? { min: d.ctcRange.min, max: d.ctcRange.max } : undefined,
    isActive: d.isActive,
    createdAt: d.createdAt,
  };
}

export const designationService = {
  async list(ctx: AuthContext, query: ListQuery, filter: DesignationFilter) {
    const { rows, total } = await designationRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicDesignation> {
    const doc = await designationRepository.findById(ctx.companyId, id);
    if (!doc) throw AppError.notFound('Designation not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: DesignationCreateInput, meta?: AuditInput['meta']) {
    if (await designationRepository.exists(ctx.companyId, { code: input.code })) {
      throw AppError.conflict(`Designation code ${input.code} already exists`);
    }

    const created = await designationRepository.create({
      companyId: ctx.companyId as unknown as DesignationDoc['companyId'],
      createdBy: ctx.userId as unknown as DesignationDoc['createdBy'],
      updatedBy: ctx.userId as unknown as DesignationDoc['updatedBy'],
      name: input.name,
      code: input.code,
      description: input.description,
      grade: input.grade,
      band: input.band,
      level: input.level ?? 0,
      ctcRange: input.ctcRange,
      isActive: input.isActive ?? true,
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'departments',
      entityId: String(created._id),
      summary: `Created designation ${created.code}`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: DesignationUpdateInput, meta?: AuditInput['meta']) {
    const before = await designationRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Designation not found');

    if (input.code && input.code !== before.code) {
      if (await designationRepository.exists(ctx.companyId, { code: input.code })) {
        throw AppError.conflict(`Designation code ${input.code} already exists`);
      }
    }

    const patch: Partial<DesignationDoc> = {
      updatedBy: ctx.userId as unknown as DesignationDoc['updatedBy'],
      ...(input.name !== undefined && { name: input.name }),
      ...(input.code !== undefined && { code: input.code }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.grade !== undefined && { grade: input.grade }),
      ...(input.band !== undefined && { band: input.band }),
      ...(input.level !== undefined && { level: input.level }),
      ...(input.ctcRange !== undefined && { ctcRange: input.ctcRange }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };

    const updated = await designationRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Designation not found');

    const changes = computeDiff(
      before as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      ['name', 'code', 'description', 'grade', 'band', 'level', 'ctcRange', 'isActive'],
    );

    await recordAudit(ctx, {
      action: 'update',
      module: 'departments',
      entityId: id,
      summary: `Updated designation ${updated.code}`,
      changes,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await designationRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Designation not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'departments',
      entityId: id,
      summary: `Deleted designation ${removed.code}`,
      meta,
    });
    return { id };
  },
};
