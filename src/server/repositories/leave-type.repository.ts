import type { FilterQuery } from 'mongoose';
import { LeaveType, type LeaveTypeDoc } from '@/models/LeaveType';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type LeaveTypeFilter = {
  isActive?: string;
};

class LeaveTypeRepository extends BaseRepository<LeaveTypeDoc> {
  constructor() {
    super(LeaveType);
  }

  /** List with search across name + code. */
  async search(companyId: string, query: ListQuery, filter: LeaveTypeFilter) {
    const where: FilterQuery<LeaveTypeDoc> = {};
    if (filter.isActive === 'true') where.isActive = true;
    if (filter.isActive === 'false') where.isActive = false;

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ name: rx }, { code: rx }];
    }

    return this.list(companyId, query, where);
  }
}

export const leaveTypeRepository = new LeaveTypeRepository();
