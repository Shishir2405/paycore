import type { FilterQuery } from 'mongoose';
import { LeaveRequest, type LeaveRequestDoc } from '@/models/LeaveRequest';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type LeaveRequestFilter = {
  status?: string;
  employeeId?: string;
  leaveTypeId?: string;
};

class LeaveRequestRepository extends BaseRepository<LeaveRequestDoc> {
  constructor() {
    super(LeaveRequest);
  }

  /** List with status / employee / type filters and reason search. */
  async search(companyId: string, query: ListQuery, filter: LeaveRequestFilter) {
    const where: FilterQuery<LeaveRequestDoc> = {};
    if (filter.status) where.status = filter.status;
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.leaveTypeId) where.leaveTypeId = filter.leaveTypeId;

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ reason: rx }];
    }

    return this.list(companyId, query, where, {
      populate: ['employeeId', 'leaveTypeId'],
    });
  }
}

export const leaveRequestRepository = new LeaveRequestRepository();
