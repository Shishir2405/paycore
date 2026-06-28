/**
 * Cost Center domain logic: tenant scoping, unique-code enforcement, audit
 * trail. Routes call this; this layer calls the repository — never Mongoose.
 */
import type { CostCenterDoc } from '@/models/CostCenter';
import { costCenterRepository, type CostCenterFilter } from '@/server/repositories/cost-center.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type { CostCenterCreateInput, CostCenterUpdateInput } from '@/lib/validators/finance';

export type PublicCostCenter = {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string | null;
  parentName?: string | null;
  isActive: boolean;
};

function toPublic(doc: Record<string, unknown>): PublicCostCenter {
  const d = doc as unknown as CostCenterDoc & { _id: unknown; parentId?: unknown };
  // parentId may be populated to a doc, or a raw ObjectId.
  const parent = d.parentId as { _id?: unknown; name?: string } | null | undefined;
  const parentId =
    parent && typeof parent === 'object' && '_id' in parent ? String(parent._id) : parent ? String(parent) : null;
  const parentName = parent && typeof parent === 'object' && 'name' in parent ? (parent.name ?? null) : null;

  return {
    id: String(d._id),
    name: d.name,
    code: d.code,
    description: d.description,
    parentId,
    parentName,
    isActive: d.isActive,
  };
}

export const costCenterService = {
  async list(ctx: AuthContext, query: ListQuery, filter: CostCenterFilter) {
    const { rows, total } = await costCenterRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicCostCenter> {
    const doc = await costCenterRepository.findById(ctx.companyId, id, { populate: 'parentId' });
    if (!doc) throw AppError.notFound('Cost center not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: CostCenterCreateInput, meta?: AuditInput['meta']) {
    if (await costCenterRepository.exists(ctx.companyId, { code: input.code })) {
      throw AppError.conflict(`Cost center code ${input.code} already exists`);
    }

    const created = await costCenterRepository.create({
      companyId: ctx.companyId as unknown as CostCenterDoc['companyId'],
      createdBy: ctx.userId as unknown as CostCenterDoc['createdBy'],
      updatedBy: ctx.userId as unknown as CostCenterDoc['updatedBy'],
      name: input.name,
      code: input.code,
      description: input.description,
      parentId: (input.parentId || null) as unknown as CostCenterDoc['parentId'],
      isActive: input.isActive ?? true,
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'finance',
      entityId: String(created._id),
      summary: `Created cost center ${input.code}`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: CostCenterUpdateInput, meta?: AuditInput['meta']) {
    const before = await costCenterRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Cost center not found');

    if (input.code && input.code !== before.code) {
      if (await costCenterRepository.exists(ctx.companyId, { code: input.code })) {
        throw AppError.conflict(`Cost center code ${input.code} already exists`);
      }
    }

    const patch: Partial<CostCenterDoc> = {
      updatedBy: ctx.userId as unknown as CostCenterDoc['updatedBy'],
      ...(input.name !== undefined && { name: input.name }),
      ...(input.code !== undefined && { code: input.code }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.parentId !== undefined && {
        parentId: (input.parentId || null) as unknown as CostCenterDoc['parentId'],
      }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };

    const updated = await costCenterRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Cost center not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'finance',
      entityId: id,
      summary: `Updated cost center ${updated.code}`,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await costCenterRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Cost center not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'finance',
      entityId: id,
      summary: `Deleted cost center ${removed.code}`,
      meta,
    });
    return { id };
  },
};
