/**
 * Leave balance domain logic: read-only listing for the UI plus the public
 * mapper. Mutations to `used`/`balance` happen through the repository's
 * `adjustUsed`, invoked by the leave-request service on approve/reject.
 */
import type { LeaveBalanceDoc } from '@/models/LeaveBalance';
import {
  leaveBalanceRepository,
  type LeaveBalanceFilter,
} from '@/server/repositories/leave-balance.repository';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';

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

export type PublicLeaveBalance = {
  id: string;
  employeeId: string | null;
  employeeName?: string;
  leaveTypeId: string | null;
  leaveTypeName?: string;
  year: number;
  entitled: number;
  used: number;
  balance: number;
};

function toPublic(doc: Record<string, unknown>): PublicLeaveBalance {
  const d = doc as unknown as LeaveBalanceDoc & { _id: unknown };
  return {
    id: String(d._id),
    employeeId: refId(d.employeeId as unknown as RefLike),
    employeeName: refName(d.employeeId as unknown as RefLike),
    leaveTypeId: refId(d.leaveTypeId as unknown as RefLike),
    leaveTypeName: refName(d.leaveTypeId as unknown as RefLike),
    year: d.year,
    entitled: d.entitled,
    used: d.used,
    balance: d.balance,
  };
}

export const leaveBalanceService = {
  async list(ctx: AuthContext, query: ListQuery, filter: LeaveBalanceFilter) {
    const { rows, total } = await leaveBalanceRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },
};
