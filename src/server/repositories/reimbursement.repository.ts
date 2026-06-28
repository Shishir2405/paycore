import type { FilterQuery } from 'mongoose';
import { Reimbursement, type ReimbursementDoc } from '@/models/Reimbursement';
import type { ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type ReimbursementFilter = {
  employeeId?: string;
  type?: string;
  status?: string;
};

class ReimbursementRepository extends BaseRepository<ReimbursementDoc> {
  constructor() {
    super(Reimbursement);
  }

  async search(companyId: string, query: ListQuery, filter: ReimbursementFilter) {
    const where: FilterQuery<ReimbursementDoc> = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;

    return this.list(companyId, query, where, { populate: ['employeeId'] });
  }
}

export const reimbursementRepository = new ReimbursementRepository();
