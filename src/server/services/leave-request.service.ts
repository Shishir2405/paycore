/**
 * Leave request domain logic: tenant scoping, audit trail, and the
 * approve()/reject() transitions. Approving an open request stamps the approver,
 * sets status/decidedAt, and increments the employee's LeaveBalance.used for the
 * request year. Rejecting/cancelling a previously-approved request releases the
 * days back. Routes call this; this layer calls repositories — never Mongoose.
 */
import type { LeaveRequestDoc, LeaveRequestStatus } from '@/models/LeaveRequest';
import {
  leaveRequestRepository,
  type LeaveRequestFilter,
} from '@/server/repositories/leave-request.repository';
import { leaveBalanceRepository } from '@/server/repositories/leave-balance.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type {
  LeaveDecisionInput,
  LeaveRequestCreateInput,
  LeaveRequestUpdateInput,
} from '@/lib/validators/leave';

type RefLike = { _id?: unknown; id?: unknown } | string | null | undefined;

function refId(ref: RefLike): string | null {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  const obj = ref as { _id?: unknown; id?: unknown };
  return obj._id ? String(obj._id) : obj.id ? String(obj.id) : null;
}

function refName(ref: RefLike): string | undefined {
  if (!ref || typeof ref === 'string') return undefined;
  const obj = ref as { firstName?: string; lastName?: string; name?: string };
  if (obj.name) return obj.name;
  const full = [obj.firstName, obj.lastName].filter(Boolean).join(' ');
  return full || undefined;
}

export type PublicLeaveRequest = {
  id: string;
  employeeId: string | null;
  employeeName?: string;
  leaveTypeId: string | null;
  leaveTypeName?: string;
  fromDate: Date;
  toDate: Date;
  days: number;
  reason?: string;
  status: LeaveRequestStatus;
  approverId?: string | null;
  decidedAt?: Date | null;
  decisionNote?: string;
};

function toPublic(doc: Record<string, unknown>): PublicLeaveRequest {
  const d = doc as unknown as LeaveRequestDoc & { _id: unknown };
  return {
    id: String(d._id),
    employeeId: refId(d.employeeId as unknown as RefLike),
    employeeName: refName(d.employeeId as unknown as RefLike),
    leaveTypeId: refId(d.leaveTypeId as unknown as RefLike),
    leaveTypeName: refName(d.leaveTypeId as unknown as RefLike),
    fromDate: d.fromDate,
    toDate: d.toDate,
    days: d.days,
    reason: d.reason,
    status: d.status,
    approverId: d.approverId ? String(d.approverId) : null,
    decidedAt: d.decidedAt ?? null,
    decisionNote: d.decisionNote,
  };
}

export const leaveRequestService = {
  async list(ctx: AuthContext, query: ListQuery, filter: LeaveRequestFilter) {
    const { rows, total } = await leaveRequestRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicLeaveRequest> {
    const doc = await leaveRequestRepository.findById(ctx.companyId, id, {
      populate: ['employeeId', 'leaveTypeId'],
    });
    if (!doc) throw AppError.notFound('Leave request not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: LeaveRequestCreateInput, meta?: AuditInput['meta']) {
    const created = await leaveRequestRepository.create({
      companyId: ctx.companyId as unknown as LeaveRequestDoc['companyId'],
      createdBy: ctx.userId as unknown as LeaveRequestDoc['createdBy'],
      updatedBy: ctx.userId as unknown as LeaveRequestDoc['updatedBy'],
      employeeId: input.employeeId as unknown as LeaveRequestDoc['employeeId'],
      leaveTypeId: input.leaveTypeId as unknown as LeaveRequestDoc['leaveTypeId'],
      fromDate: input.fromDate,
      toDate: input.toDate,
      days: input.days,
      reason: input.reason,
      status: 'Pending',
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'leave',
      entityId: String(created._id),
      summary: `Created leave request for ${input.days} day(s)`,
      meta,
    });

    return this.get(ctx, String(created._id));
  },

  async update(ctx: AuthContext, id: string, input: LeaveRequestUpdateInput, meta?: AuditInput['meta']) {
    const before = await leaveRequestRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Leave request not found');
    if (before.status !== 'Pending') {
      throw AppError.conflict('Only pending requests can be edited');
    }

    const patch: Partial<LeaveRequestDoc> = {
      updatedBy: ctx.userId as unknown as LeaveRequestDoc['updatedBy'],
      ...(input.fromDate !== undefined && { fromDate: input.fromDate }),
      ...(input.toDate !== undefined && { toDate: input.toDate }),
      ...(input.days !== undefined && { days: input.days }),
      ...(input.reason !== undefined && { reason: input.reason }),
    };

    const updated = await leaveRequestRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Leave request not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'leave',
      entityId: id,
      summary: 'Updated leave request',
      meta,
    });

    return this.get(ctx, id);
  },

  /** Approve a pending request and consume the employee's balance for the year. */
  async approve(ctx: AuthContext, id: string, input: LeaveDecisionInput, meta?: AuditInput['meta']) {
    const before = await leaveRequestRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Leave request not found');
    if (before.status !== 'Pending') {
      throw AppError.conflict(`Cannot approve a ${before.status.toLowerCase()} request`);
    }

    const updated = await leaveRequestRepository.updateById(ctx.companyId, id, {
      status: 'Approved' as LeaveRequestStatus,
      approverId: ctx.userId as unknown as LeaveRequestDoc['approverId'],
      decidedAt: new Date(),
      decisionNote: input.decisionNote,
      updatedBy: ctx.userId as unknown as LeaveRequestDoc['updatedBy'],
    });
    if (!updated) throw AppError.notFound('Leave request not found');

    // Consume the leave days from the employee's balance for the request's year.
    const year = new Date(before.fromDate).getFullYear();
    await leaveBalanceRepository.adjustUsed(
      ctx.companyId,
      String(before.employeeId),
      String(before.leaveTypeId),
      year,
      before.days,
    );

    await recordAudit(ctx, {
      action: 'approve',
      module: 'leave',
      entityId: id,
      summary: `Approved leave request (${before.days} day(s))`,
      meta,
    });

    return this.get(ctx, id);
  },

  /** Reject a request. If it was already approved, release the consumed days. */
  async reject(ctx: AuthContext, id: string, input: LeaveDecisionInput, meta?: AuditInput['meta']) {
    const before = await leaveRequestRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Leave request not found');
    if (before.status === 'Rejected') {
      throw AppError.conflict('Request is already rejected');
    }
    if (before.status === 'Cancelled') {
      throw AppError.conflict('Cannot reject a cancelled request');
    }

    const wasApproved = before.status === 'Approved';

    const updated = await leaveRequestRepository.updateById(ctx.companyId, id, {
      status: 'Rejected' as LeaveRequestStatus,
      approverId: ctx.userId as unknown as LeaveRequestDoc['approverId'],
      decidedAt: new Date(),
      decisionNote: input.decisionNote,
      updatedBy: ctx.userId as unknown as LeaveRequestDoc['updatedBy'],
    });
    if (!updated) throw AppError.notFound('Leave request not found');

    if (wasApproved) {
      const year = new Date(before.fromDate).getFullYear();
      await leaveBalanceRepository.adjustUsed(
        ctx.companyId,
        String(before.employeeId),
        String(before.leaveTypeId),
        year,
        -before.days,
      );
    }

    await recordAudit(ctx, {
      action: 'update',
      module: 'leave',
      entityId: id,
      summary: `Rejected leave request${wasApproved ? ' (balance released)' : ''}`,
      meta,
    });

    return this.get(ctx, id);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const before = await leaveRequestRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Leave request not found');

    // Release any consumed balance before removing an approved request.
    if (before.status === 'Approved') {
      const year = new Date(before.fromDate).getFullYear();
      await leaveBalanceRepository.adjustUsed(
        ctx.companyId,
        String(before.employeeId),
        String(before.leaveTypeId),
        year,
        -before.days,
      );
    }

    const removed = await leaveRequestRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Leave request not found');

    await recordAudit(ctx, {
      action: 'delete',
      module: 'leave',
      entityId: id,
      summary: 'Deleted leave request',
      meta,
    });
    return { id };
  },
};
