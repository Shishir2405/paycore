import type { FilterQuery } from 'mongoose';
import { FinalSettlement, type FinalSettlementDoc } from '@/models/FinalSettlement';
import type { ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type FinalSettlementFilter = {
  employeeId?: string;
  status?: string;
};

class FinalSettlementRepository extends BaseRepository<FinalSettlementDoc> {
  constructor() {
    super(FinalSettlement);
  }

  async search(companyId: string, query: ListQuery, filter: FinalSettlementFilter) {
    const where: FilterQuery<FinalSettlementDoc> = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.status) where.status = filter.status;
    return this.list(companyId, query, where, { populate: ['employeeId'] });
  }
}

export const finalSettlementRepository = new FinalSettlementRepository();
