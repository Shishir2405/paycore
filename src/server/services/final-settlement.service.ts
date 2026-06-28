/**
 * Final settlement (Full & Final) domain logic. The net settlement is derived on
 * write: leaveEncashment + gratuity + otherDues − noticeRecovery (never below 0
 * in storage is NOT enforced — a net recovery can be negative).
 */
import type { FinalSettlementDoc } from '@/models/FinalSettlement';
import {
  finalSettlementRepository,
  type FinalSettlementFilter,
} from '@/server/repositories/final-settlement.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import { money2, toEmployeeRef, type EmployeeRef } from './benefits.shared';
import type { AuthContext } from '@/types';
import type {
  FinalSettlementCreateInput,
  FinalSettlementUpdateInput,
} from '@/lib/validators/payroll';

export type PublicFinalSettlement = {
  id: string;
  employee: EmployeeRef;
  lastWorkingDay: Date;
  leaveEncashment: number;
  gratuity: number;
  noticeRecovery: number;
  otherDues: number;
  netSettlement: number;
  status: string;
  approvedAt?: Date | null;
  notes?: string;
  createdAt?: Date;
};

function toPublic(doc: Record<string, unknown>): PublicFinalSettlement {
  const d = doc as unknown as FinalSettlementDoc & { _id: unknown; createdAt?: Date };
  return {
    id: String(d._id),
    employee: toEmployeeRef(d.employeeId),
    lastWorkingDay: d.lastWorkingDay,
    leaveEncashment: d.leaveEncashment,
    gratuity: d.gratuity,
    noticeRecovery: d.noticeRecovery,
    otherDues: d.otherDues,
    netSettlement: d.netSettlement,
    status: d.status,
    approvedAt: d.approvedAt ?? null,
    notes: d.notes,
    createdAt: d.createdAt,
  };
}

/** netSettlement = encashment + gratuity + otherDues − noticeRecovery. */
function computeNet(parts: {
  leaveEncashment: number;
  gratuity: number;
  otherDues: number;
  noticeRecovery: number;
}): number {
  return money2(parts.leaveEncashment + parts.gratuity + parts.otherDues - parts.noticeRecovery);
}

export const finalSettlementService = {
  async list(ctx: AuthContext, query: ListQuery, filter: FinalSettlementFilter) {
    const { rows, total } = await finalSettlementRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicFinalSettlement> {
    const doc = await finalSettlementRepository.findById(ctx.companyId, id, { populate: ['employeeId'] });
    if (!doc) throw AppError.notFound('Final settlement not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: FinalSettlementCreateInput, meta?: AuditInput['meta']) {
    const netSettlement = computeNet(input);
    const created = await finalSettlementRepository.create({
      companyId: ctx.companyId as unknown as FinalSettlementDoc['companyId'],
      createdBy: ctx.userId as unknown as FinalSettlementDoc['createdBy'],
      updatedBy: ctx.userId as unknown as FinalSettlementDoc['updatedBy'],
      employeeId: input.employeeId as unknown as FinalSettlementDoc['employeeId'],
      lastWorkingDay: input.lastWorkingDay,
      leaveEncashment: money2(input.leaveEncashment),
      gratuity: money2(input.gratuity),
      noticeRecovery: money2(input.noticeRecovery),
      otherDues: money2(input.otherDues),
      netSettlement,
      status: 'Draft',
      notes: input.notes,
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'payroll',
      entityId: String(created._id),
      summary: `Created final settlement — net ₹${netSettlement}`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: FinalSettlementUpdateInput, meta?: AuditInput['meta']) {
    const before = await finalSettlementRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Final settlement not found');

    const merged = {
      leaveEncashment: input.leaveEncashment ?? before.leaveEncashment,
      gratuity: input.gratuity ?? before.gratuity,
      otherDues: input.otherDues ?? before.otherDues,
      noticeRecovery: input.noticeRecovery ?? before.noticeRecovery,
    };

    const updated = await finalSettlementRepository.updateById(ctx.companyId, id, {
      updatedBy: ctx.userId as unknown as FinalSettlementDoc['updatedBy'],
      ...(input.employeeId !== undefined && {
        employeeId: input.employeeId as unknown as FinalSettlementDoc['employeeId'],
      }),
      ...(input.lastWorkingDay !== undefined && { lastWorkingDay: input.lastWorkingDay }),
      leaveEncashment: money2(merged.leaveEncashment),
      gratuity: money2(merged.gratuity),
      otherDues: money2(merged.otherDues),
      noticeRecovery: money2(merged.noticeRecovery),
      netSettlement: computeNet(merged),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.status !== undefined && {
        status: input.status,
        ...(input.status === 'Approved' && { approvedAt: new Date() }),
      }),
    });
    if (!updated) throw AppError.notFound('Final settlement not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'payroll',
      entityId: id,
      summary: `Updated final settlement — net ₹${updated.netSettlement}`,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await finalSettlementRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Final settlement not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'payroll',
      entityId: id,
      summary: 'Deleted final settlement',
      meta,
    });
    return { id };
  },
};
