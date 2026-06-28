import type { FilterQuery } from 'mongoose';
import { LeaveBalance, type LeaveBalanceDoc } from '@/models/LeaveBalance';
import type { ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type LeaveBalanceFilter = {
  employeeId?: string;
  leaveTypeId?: string;
  year?: string;
};

class LeaveBalanceRepository extends BaseRepository<LeaveBalanceDoc> {
  constructor() {
    super(LeaveBalance);
  }

  /** List balances filtered by employee / type / year. */
  async search(companyId: string, query: ListQuery, filter: LeaveBalanceFilter) {
    const where: FilterQuery<LeaveBalanceDoc> = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.leaveTypeId) where.leaveTypeId = filter.leaveTypeId;
    if (filter.year) {
      const yr = Number.parseInt(filter.year, 10);
      if (Number.isFinite(yr)) where.year = yr;
    }

    return this.list(companyId, query, where, {
      populate: ['employeeId', 'leaveTypeId'],
    });
  }

  /** Find the single balance row for an employee/type/year (incl. soft-deleted check via scoped). */
  async findForKey(companyId: string, employeeId: string, leaveTypeId: string, year: number) {
    return this.findOne(companyId, { employeeId, leaveTypeId, year } as FilterQuery<LeaveBalanceDoc>);
  }

  /**
   * Atomically adjust `used` (and recompute `balance`) for an approved/rejected
   * request. `delta` may be negative to release days back on cancellation.
   */
  async adjustUsed(
    companyId: string,
    employeeId: string,
    leaveTypeId: string,
    year: number,
    delta: number,
  ): Promise<LeaveBalanceDoc | null> {
    const existing = await this.collection
      .findOne({ companyId, employeeId, leaveTypeId, year, isDeleted: false })
      .lean<LeaveBalanceDoc>({ virtuals: true })
      .exec();

    const entitled = existing?.entitled ?? 0;
    const nextUsed = Math.max(0, (existing?.used ?? 0) + delta);
    const nextBalance = entitled - nextUsed;

    return this.collection
      .findOneAndUpdate(
        { companyId, employeeId, leaveTypeId, year, isDeleted: false },
        { $set: { used: nextUsed, balance: nextBalance } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .lean<LeaveBalanceDoc>({ virtuals: true })
      .exec();
  }
}

export const leaveBalanceRepository = new LeaveBalanceRepository();
