/**
 * Insurance policy domain logic. Thin CRUD over the repository with audit + a
 * per-tenant unique policy number enforced at the service layer for a friendly
 * error before the DB unique index fires.
 */
import type { InsurancePolicyDoc } from '@/models/InsurancePolicy';
import {
  insurancePolicyRepository,
  type InsurancePolicyFilter,
} from '@/server/repositories/insurance-policy.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type {
  InsurancePolicyCreateInput,
  InsurancePolicyUpdateInput,
} from '@/lib/validators/benefits';
import { toEmployeeRef, type EmployeeRef } from './benefits.shared';

export type PublicInsurancePolicy = {
  id: string;
  employee: EmployeeRef;
  policyNo: string;
  provider: string;
  sumInsured: number;
  premiumMonthly: number;
  isActive: boolean;
  createdAt?: Date;
};

function toPublic(doc: Record<string, unknown>): PublicInsurancePolicy {
  const d = doc as unknown as InsurancePolicyDoc & { _id: unknown; createdAt?: Date };
  return {
    id: String(d._id),
    employee: toEmployeeRef(d.employeeId),
    policyNo: d.policyNo,
    provider: d.provider,
    sumInsured: d.sumInsured,
    premiumMonthly: d.premiumMonthly,
    isActive: d.isActive,
    createdAt: d.createdAt,
  };
}

export const insurancePolicyService = {
  async list(ctx: AuthContext, query: ListQuery, filter: InsurancePolicyFilter) {
    const { rows, total } = await insurancePolicyRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicInsurancePolicy> {
    const doc = await insurancePolicyRepository.findById(ctx.companyId, id, {
      populate: ['employeeId'],
    });
    if (!doc) throw AppError.notFound('Insurance policy not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: InsurancePolicyCreateInput, meta?: AuditInput['meta']) {
    if (await insurancePolicyRepository.exists(ctx.companyId, { policyNo: input.policyNo })) {
      throw AppError.conflict(`Policy ${input.policyNo} already exists`);
    }

    const created = await insurancePolicyRepository.create({
      companyId: ctx.companyId as unknown as InsurancePolicyDoc['companyId'],
      createdBy: ctx.userId as unknown as InsurancePolicyDoc['createdBy'],
      updatedBy: ctx.userId as unknown as InsurancePolicyDoc['updatedBy'],
      employeeId: input.employeeId as unknown as InsurancePolicyDoc['employeeId'],
      policyNo: input.policyNo,
      provider: input.provider,
      sumInsured: input.sumInsured,
      premiumMonthly: input.premiumMonthly,
      isActive: input.isActive ?? true,
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'benefits',
      entityId: String(created._id),
      summary: `Added insurance policy ${input.policyNo} (${input.provider})`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: InsurancePolicyUpdateInput, meta?: AuditInput['meta']) {
    const before = await insurancePolicyRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Insurance policy not found');

    if (input.policyNo && input.policyNo !== before.policyNo) {
      if (await insurancePolicyRepository.exists(ctx.companyId, { policyNo: input.policyNo })) {
        throw AppError.conflict(`Policy ${input.policyNo} already exists`);
      }
    }

    const patch: Partial<InsurancePolicyDoc> = {
      updatedBy: ctx.userId as unknown as InsurancePolicyDoc['updatedBy'],
      ...(input.employeeId !== undefined && {
        employeeId: input.employeeId as unknown as InsurancePolicyDoc['employeeId'],
      }),
      ...(input.policyNo !== undefined && { policyNo: input.policyNo }),
      ...(input.provider !== undefined && { provider: input.provider }),
      ...(input.sumInsured !== undefined && { sumInsured: input.sumInsured }),
      ...(input.premiumMonthly !== undefined && { premiumMonthly: input.premiumMonthly }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    };

    const updated = await insurancePolicyRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Insurance policy not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'benefits',
      entityId: id,
      summary: `Updated insurance policy ${updated.policyNo}`,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await insurancePolicyRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Insurance policy not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'benefits',
      entityId: id,
      summary: `Deleted insurance policy ${removed.policyNo}`,
      meta,
    });
    return { id };
  },
};
