/**
 * Tax (TDS) domain logic: investment declarations, proof verification, and
 * regime comparison. Route handlers call this; this layer calls the repository
 * — never Mongoose directly. All reads/writes are tenant-scoped via AuthContext.
 */
import type { TaxDeclarationDoc, TaxDeclarationSection } from '@/models/TaxDeclaration';
import {
  taxDeclarationRepository,
  type TaxDeclarationFilter,
} from '@/server/repositories/tax.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta } from '@/lib/utils/pagination';
import type { ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type {
  TaxDeclarationCreateInput,
  TaxDeclarationUpdateInput,
  TaxDeclarationVerifyInput,
  RegimeCompareInput,
} from '@/lib/validators/tax';
import { recommendRegime, type RegimeRecommendation } from '@/lib/tax/regime';

export type PublicTaxSection = {
  code: string;
  label?: string;
  declaredAmount: number;
  proofAmount: number;
  verified: boolean;
};

export type PublicTaxDeclaration = {
  id: string;
  employeeId: string | null;
  employeeName?: string;
  employeeCode?: string;
  financialYear: string;
  regime: string;
  status: string;
  sections: PublicTaxSection[];
  totalDeclared: number;
  totalProof: number;
  submittedAt?: string | null;
  createdAt?: string;
};

/** A populated employee ref looks like a small object; otherwise it's an id. */
type EmployeeRef =
  | { _id: unknown; employeeCode?: string; firstName?: string; lastName?: string }
  | string
  | null
  | undefined;

function readEmployee(ref: EmployeeRef): { id: string | null; name?: string; code?: string } {
  if (!ref) return { id: null };
  if (typeof ref === 'string') return { id: ref };
  return {
    id: String(ref._id),
    code: ref.employeeCode,
    name: [ref.firstName, ref.lastName].filter(Boolean).join(' ') || undefined,
  };
}

function toPublic(doc: Record<string, unknown>): PublicTaxDeclaration {
  const d = doc as unknown as TaxDeclarationDoc & { _id: unknown; employeeId: EmployeeRef };
  const emp = readEmployee(d.employeeId);
  const sections = (d.sections ?? []).map((s) => ({
    code: s.code,
    label: s.label,
    declaredAmount: s.declaredAmount,
    proofAmount: s.proofAmount,
    verified: s.verified,
  }));
  return {
    id: String(d._id),
    employeeId: emp.id,
    employeeName: emp.name,
    employeeCode: emp.code,
    financialYear: d.financialYear,
    regime: d.regime,
    status: d.status,
    sections,
    totalDeclared: sections.reduce((sum, s) => sum + (s.declaredAmount || 0), 0),
    totalProof: sections.reduce((sum, s) => sum + (s.proofAmount || 0), 0),
    submittedAt: d.submittedAt ? new Date(d.submittedAt).toISOString() : null,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined,
  };
}

function mapSections(
  input: TaxDeclarationCreateInput['sections'] | undefined,
): TaxDeclarationSection[] {
  return (input ?? []).map((s) => ({
    code: s.code,
    label: s.label,
    declaredAmount: s.declaredAmount ?? 0,
    proofAmount: s.proofAmount ?? 0,
    verified: s.verified ?? false,
  }));
}

export const taxService = {
  async list(ctx: AuthContext, query: ListQuery, filter: TaxDeclarationFilter) {
    const { rows, total } = await taxDeclarationRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicTaxDeclaration> {
    const doc = await taxDeclarationRepository.findById(ctx.companyId, id, {
      populate: ['employeeId'],
    });
    if (!doc) throw AppError.notFound('Tax declaration not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: TaxDeclarationCreateInput, meta?: AuditInput['meta']) {
    const exists = await taxDeclarationRepository.exists(ctx.companyId, {
      employeeId: input.employeeId,
      financialYear: input.financialYear,
    } as Record<string, unknown>);
    if (exists) {
      throw AppError.conflict(
        `A declaration for ${input.financialYear} already exists for this employee`,
      );
    }

    const status = input.status ?? 'Draft';
    const created = await taxDeclarationRepository.create({
      companyId: ctx.companyId as unknown as TaxDeclarationDoc['companyId'],
      createdBy: ctx.userId as unknown as TaxDeclarationDoc['createdBy'],
      updatedBy: ctx.userId as unknown as TaxDeclarationDoc['updatedBy'],
      employeeId: input.employeeId as unknown as TaxDeclarationDoc['employeeId'],
      financialYear: input.financialYear,
      regime: input.regime ?? 'New',
      sections: mapSections(input.sections),
      status,
      submittedAt: status === 'Draft' ? null : new Date(),
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'tax',
      entityId: String(created._id),
      summary: `Created tax declaration ${input.financialYear}`,
      meta,
    });

    return this.get(ctx, String(created._id));
  },

  async update(
    ctx: AuthContext,
    id: string,
    input: TaxDeclarationUpdateInput,
    meta?: AuditInput['meta'],
  ) {
    const before = await taxDeclarationRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Tax declaration not found');
    if (before.status === 'Verified') {
      throw AppError.conflict('A verified declaration cannot be edited');
    }

    const patch: Partial<TaxDeclarationDoc> = {
      updatedBy: ctx.userId as unknown as TaxDeclarationDoc['updatedBy'],
      ...(input.regime !== undefined && { regime: input.regime }),
      ...(input.sections !== undefined && { sections: mapSections(input.sections) }),
    };

    // A transition out of Draft stamps the submission time once.
    if (input.status && input.status !== before.status) {
      patch.status = input.status;
      if (input.status !== 'Draft' && !before.submittedAt) patch.submittedAt = new Date();
    }

    const updated = await taxDeclarationRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Tax declaration not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'tax',
      entityId: id,
      summary: `Updated tax declaration ${updated.financialYear}`,
      meta,
    });

    return this.get(ctx, id);
  },

  /** Mark a declaration as Verified (and optionally flag every section verified). */
  async verify(
    ctx: AuthContext,
    id: string,
    input: TaxDeclarationVerifyInput,
    meta?: AuditInput['meta'],
  ) {
    const before = await taxDeclarationRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Tax declaration not found');
    if (before.status === 'Draft') {
      throw AppError.conflict('Submit the declaration before verifying it');
    }

    const sections = (before.sections ?? []).map((s) => ({
      code: s.code,
      label: s.label,
      declaredAmount: s.declaredAmount,
      proofAmount: s.proofAmount,
      verified: input.markSectionsVerified ? true : s.verified,
    }));

    const updated = await taxDeclarationRepository.updateById(ctx.companyId, id, {
      status: 'Verified',
      sections,
      updatedBy: ctx.userId as unknown as TaxDeclarationDoc['updatedBy'],
    });
    if (!updated) throw AppError.notFound('Tax declaration not found');

    await recordAudit(ctx, {
      action: 'approve',
      module: 'tax',
      entityId: id,
      summary: `Verified tax declaration ${updated.financialYear}`,
      meta,
    });

    return this.get(ctx, id);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await taxDeclarationRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Tax declaration not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'tax',
      entityId: id,
      summary: `Deleted tax declaration ${removed.financialYear}`,
      meta,
    });
    return { id };
  },

  /** Pure computation — no persistence. Compares Old vs New regimes. */
  compareRegimes(input: RegimeCompareInput): RegimeRecommendation {
    return recommendRegime(input.grossIncome, input.deductions);
  },
};
