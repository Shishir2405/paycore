/**
 * Reimbursement domain logic with an approval workflow. A claim is created
 * Pending; `approve`/`reject` stamp the decider and a decision note, and are the
 * only transitions out of Pending.
 */
import type { ReimbursementDoc, ReimbursementStatus } from '@/models/Reimbursement';
import {
  reimbursementRepository,
  type ReimbursementFilter,
} from '@/server/repositories/reimbursement.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type {
  ReimbursementCreateInput,
  ReimbursementUpdateInput,
} from '@/lib/validators/benefits';
import { toEmployeeRef, type EmployeeRef } from './benefits.shared';

export type PublicReimbursement = {
  id: string;
  employee: EmployeeRef;
  type: string;
  amount: number;
  date: Date;
  status: string;
  description?: string;
  receiptUrl?: string;
  decidedAt?: Date | null;
  decisionNote?: string;
  createdAt?: Date;
};

function toPublic(doc: Record<string, unknown>): PublicReimbursement {
  const d = doc as unknown as ReimbursementDoc & { _id: unknown; createdAt?: Date };
  return {
    id: String(d._id),
    employee: toEmployeeRef(d.employeeId),
    type: d.type,
    amount: d.amount,
    date: d.date,
    status: d.status,
    description: d.description,
    receiptUrl: d.receiptUrl,
    decidedAt: d.decidedAt,
    decisionNote: d.decisionNote,
    createdAt: d.createdAt,
  };
}

async function decide(
  ctx: AuthContext,
  id: string,
  status: Extract<ReimbursementStatus, 'Approved' | 'Rejected'>,
  note?: string,
  meta?: AuditInput['meta'],
): Promise<PublicReimbursement> {
  const before = await reimbursementRepository.findById(ctx.companyId, id);
  if (!before) throw AppError.notFound('Reimbursement not found');
  if (before.status !== 'Pending') {
    throw AppError.conflict(`Claim already ${before.status.toLowerCase()}`);
  }

  const updated = await reimbursementRepository.updateById(ctx.companyId, id, {
    status,
    decidedBy: ctx.userId as unknown as ReimbursementDoc['decidedBy'],
    decidedAt: new Date(),
    decisionNote: note,
    updatedBy: ctx.userId as unknown as ReimbursementDoc['updatedBy'],
  });
  if (!updated) throw AppError.notFound('Reimbursement not found');

  await recordAudit(ctx, {
    action: 'approve',
    module: 'benefits',
    entityId: id,
    summary: `${status} reimbursement of ₹${updated.amount}`,
    meta,
  });

  return toPublic(updated as Record<string, unknown>);
}

export const reimbursementService = {
  async list(ctx: AuthContext, query: ListQuery, filter: ReimbursementFilter) {
    const { rows, total } = await reimbursementRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicReimbursement> {
    const doc = await reimbursementRepository.findById(ctx.companyId, id, {
      populate: ['employeeId'],
    });
    if (!doc) throw AppError.notFound('Reimbursement not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: ReimbursementCreateInput, meta?: AuditInput['meta']) {
    const created = await reimbursementRepository.create({
      companyId: ctx.companyId as unknown as ReimbursementDoc['companyId'],
      createdBy: ctx.userId as unknown as ReimbursementDoc['createdBy'],
      updatedBy: ctx.userId as unknown as ReimbursementDoc['updatedBy'],
      employeeId: input.employeeId as unknown as ReimbursementDoc['employeeId'],
      type: input.type,
      amount: input.amount,
      date: input.date,
      description: input.description,
      receiptUrl: input.receiptUrl || undefined,
      status: 'Pending',
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'benefits',
      entityId: String(created._id),
      summary: `Raised ${input.type} reimbursement of ₹${input.amount}`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: ReimbursementUpdateInput, meta?: AuditInput['meta']) {
    const before = await reimbursementRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Reimbursement not found');
    if (before.status !== 'Pending') {
      throw AppError.conflict('Only pending claims can be edited');
    }

    const patch: Partial<ReimbursementDoc> = {
      updatedBy: ctx.userId as unknown as ReimbursementDoc['updatedBy'],
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.receiptUrl !== undefined && { receiptUrl: input.receiptUrl || undefined }),
    };

    const updated = await reimbursementRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Reimbursement not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'benefits',
      entityId: id,
      summary: `Updated reimbursement ${id}`,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  approve(ctx: AuthContext, id: string, note?: string, meta?: AuditInput['meta']) {
    return decide(ctx, id, 'Approved', note, meta);
  },

  reject(ctx: AuthContext, id: string, note?: string, meta?: AuditInput['meta']) {
    return decide(ctx, id, 'Rejected', note, meta);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await reimbursementRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Reimbursement not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'benefits',
      entityId: id,
      summary: `Deleted reimbursement ${id}`,
      meta,
    });
    return { id };
  },
};
