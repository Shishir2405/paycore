/**
 * Pay Head domain logic: tenant scoping, unique-code enforcement, audit trail.
 * Route handlers call this; this layer calls the repository — never Mongoose
 * directly. `toPublic` returns plain JSON (string ids) for the API/UI.
 */
import type { PayHeadDoc } from '@/models/PayHead';
import { payHeadRepository, type PayHeadFilter } from '@/server/repositories/pay-head.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { computeDiff } from '@/lib/audit/diff';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta } from '@/lib/utils/pagination';
import type { ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type { PayHeadCreateInput, PayHeadUpdateInput } from '@/lib/validators/pay-head';

export type PublicPayHead = {
  id: string;
  name: string;
  code: string;
  type: string;
  calcType: string;
  value: number;
  formula?: string;
  taxable: boolean;
  isStatutory: boolean;
  affectsPf: boolean;
  affectsEsi: boolean;
  displayOrder: number;
  isActive: boolean;
};

function toPublic(doc: Record<string, unknown>): PublicPayHead {
  const d = doc as unknown as PayHeadDoc & { _id: unknown };
  return {
    id: String(d._id),
    name: d.name,
    code: d.code,
    type: d.type,
    calcType: d.calcType,
    value: d.value,
    formula: d.formula || undefined,
    taxable: d.taxable,
    isStatutory: d.isStatutory,
    affectsPf: d.affectsPf,
    affectsEsi: d.affectsEsi,
    displayOrder: d.displayOrder,
    isActive: d.isActive,
  };
}

/** Map validated input onto the persisted fields (Flat keeps value, others vary). */
function buildPatch(input: PayHeadCreateInput | PayHeadUpdateInput): Partial<PayHeadDoc> {
  return {
    name: input.name,
    code: input.code,
    type: input.type,
    calcType: input.calcType,
    value: input.value ?? 0,
    // Only persist a formula for Formula calc type; clear it otherwise.
    formula: input.calcType === 'Formula' ? (input.formula || undefined) : undefined,
    taxable: input.taxable ?? true,
    isStatutory: input.isStatutory ?? false,
    affectsPf: input.affectsPf ?? false,
    affectsEsi: input.affectsEsi ?? false,
    displayOrder: input.displayOrder ?? 0,
    isActive: input.isActive ?? true,
  };
}

export const payHeadService = {
  async list(ctx: AuthContext, query: ListQuery, filter: PayHeadFilter) {
    const { rows, total } = await payHeadRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicPayHead> {
    const doc = await payHeadRepository.findById(ctx.companyId, id);
    if (!doc) throw AppError.notFound('Pay head not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: PayHeadCreateInput, meta?: AuditInput['meta']) {
    if (await payHeadRepository.exists(ctx.companyId, { code: input.code })) {
      throw AppError.conflict(`Pay head code ${input.code} already exists`);
    }

    const created = await payHeadRepository.create({
      companyId: ctx.companyId as unknown as PayHeadDoc['companyId'],
      createdBy: ctx.userId as unknown as PayHeadDoc['createdBy'],
      updatedBy: ctx.userId as unknown as PayHeadDoc['updatedBy'],
      ...buildPatch(input),
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'payheads',
      entityId: String(created._id),
      summary: `Created pay head ${input.code}`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: PayHeadUpdateInput, meta?: AuditInput['meta']) {
    const before = await payHeadRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Pay head not found');

    // Guard the unique code if it changed.
    if (input.code !== before.code && (await payHeadRepository.exists(ctx.companyId, { code: input.code }))) {
      throw AppError.conflict(`Pay head code ${input.code} already exists`);
    }

    const updated = await payHeadRepository.updateById(ctx.companyId, id, {
      updatedBy: ctx.userId as unknown as PayHeadDoc['updatedBy'],
      ...buildPatch(input),
    });
    if (!updated) throw AppError.notFound('Pay head not found');

    const changes = computeDiff(
      before as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      ['name', 'code', 'type', 'calcType', 'value', 'formula', 'taxable', 'isStatutory', 'affectsPf', 'affectsEsi', 'displayOrder', 'isActive'],
    );

    await recordAudit(ctx, {
      action: 'update',
      module: 'payheads',
      entityId: id,
      summary: `Updated pay head ${updated.code}`,
      changes,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await payHeadRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Pay head not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'payheads',
      entityId: id,
      summary: `Deleted pay head ${removed.code}`,
      meta,
    });
    return { id };
  },
};
