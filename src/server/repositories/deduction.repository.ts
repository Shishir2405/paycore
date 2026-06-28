import type { FilterQuery } from 'mongoose';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { Deduction, type DeductionDoc } from '@/models/Deduction';
import { BaseRepository } from './base.repository';

export type DeductionFilter = {
  employeeId?: string;
  recurring?: boolean;
  month?: string;
};

class DeductionRepository extends BaseRepository<DeductionDoc> {
  constructor() {
    super(Deduction);
  }

  async search(companyId: string, query: ListQuery, filter: DeductionFilter) {
    const where: FilterQuery<DeductionDoc> = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.recurring !== undefined) where.recurring = filter.recurring;
    if (filter.month) where.month = filter.month;

    if (query.search) {
      where.name = new RegExp(escapeRegex(query.search), 'i');
    }

    return this.list(companyId, query, where, { populate: ['employeeId'] });
  }
}

export const deductionRepository = new DeductionRepository();
