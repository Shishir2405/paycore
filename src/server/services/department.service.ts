/**
 * Department domain logic: tenant scoping, audit trail, and a public mapper.
 * Route handlers call this; this layer calls the repository — never Mongoose
 * directly.
 */
import type { DepartmentDoc } from '@/models/Department';
import {
  departmentRepository,
  type DepartmentFilter,
} from '@/server/repositories/department.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { computeDiff } from '@/lib/audit/diff';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta } from '@/lib/utils/pagination';
import type { ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type { DepartmentCreateInput, DepartmentUpdateInput } from '@/lib/validators/department';

/** Plain JSON representation returned by the API (string ids). */
export type PublicDepartment = {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string | null;
  headEmployeeId?: string | null;
  budgetAnnual?: number;
  isActive: boolean;
  createdAt?: Date;
};

function toPublic(doc: Record<string, unknown>): PublicDepartment {
  const d = doc as unknown as DepartmentDoc & { _id: unknown };
  // `parentId` may be populated to a document — normalize back to its id.
  const parent = d.parentId as unknown as { _id?: unknown } | string | null | undefined;
  const parentId =
    parent && typeof parent === 'object' && '_id' in parent
      ? String(parent._id)
      : parent
        ? String(parent)
        : null;

  return {
    id: String(d._id),
    name: d.name,
    code: d.code,
    description: d.description,
    parentId,
    headEmployeeId: d.headEmployeeId ? String(d.headEmployeeId) : null,
    budgetAnnual: d.budgetAnnual,
    isActive: d.isActive,
    createdAt: d.createdAt,
  };
}

export const departmentService = {
  async list(ctx: AuthContext, query: ListQuery, filter: DepartmentFilter) {
    const { rows, total } = await departmentRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicDepartment> {
    const doc = await departmentRepository.findById(ctx.companyId, id);
    if (!doc) throw AppError.notFound('Department not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: DepartmentCreateInput, meta?: AuditInput['meta']) {
    if (await departmentRepository.exists(ctx.companyId, { code: input.code })) {
      throw AppError.conflict(`Department code ${input.code} already exists`);
    }

    const created = await departmentRepository.create({
      companyId: ctx.companyId as unknown as DepartmentDoc['companyId'],
      createdBy: ctx.userId as unknown as DepartmentDoc['createdBy'],
      updatedBy: ctx.userId as unknown as DepartmentDoc['updatedBy'],
      name: input.name,
      code: input.code,
      description: input.description,
      parentId: (input.parentId || null) as unknown as DepartmentDoc['parentId'],
      headEmployeeId: (input.headEmployeeId || null) as unknown as DepartmentDoc['headEmployeeId'],
      budgetAnnual: input.budgetAnnual,
      isActive: input.isActive ?? true,
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'departments',
      entityId: String(created._id),
      summary: `Created department ${created.code}`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: DepartmentUpdateInput, meta?: AuditInput['meta']) {
    const before = await departmentRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Department not found');

    if (input.code && input.code !== before.code) {
      if (await departmentRepository.exists(ctx.companyId, { code: input.code })) {
        throw AppError.conflict(`Department code ${input.code} already exists`);
      }
    }

    const patch: Partial<DepartmentDoc> = {
      updatedBy: ctx.userId as unknown as DepartmentDoc['updatedBy'],
      ...(input.name !== undefined && { name: input.name }),
      ...(input.code !== undefined && { code: input.code }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.parentId !== undefined && {
        parentId: (input.parentId || null) as unknown as DepartmentDoc['parentId'],
      }),
      ...(input.headEmployeeId !== undefined && {
        headEmployeeId: (input.headEmployeeId || null) as unknown as DepartmentDoc['headEmployeeId'],
      }),
      ...(input.budgetAnnual !== undefined && { budgetAnnual: input.budgetAnnual }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };

    const updated = await departmentRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Department not found');

    const changes = computeDiff(
      before as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      ['name', 'code', 'description', 'parentId', 'budgetAnnual', 'isActive'],
    );

    await recordAudit(ctx, {
      action: 'update',
      module: 'departments',
      entityId: id,
      summary: `Updated department ${updated.code}`,
      changes,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await departmentRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Department not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'departments',
      entityId: id,
      summary: `Deleted department ${removed.code}`,
      meta,
    });
    return { id };
  },
};
