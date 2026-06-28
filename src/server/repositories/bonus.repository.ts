import type { FilterQuery } from 'mongoose';
import { Bonus, type BonusDoc } from '@/models/Bonus';
import type { ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type BonusFilter = {
  employeeId?: string;
  type?: string;
  year?: string;
  month?: string;
};

class BonusRepository extends BaseRepository<BonusDoc> {
  constructor() {
    super(Bonus);
  }

  async search(companyId: string, query: ListQuery, filter: BonusFilter) {
    const where: FilterQuery<BonusDoc> = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.type) where.type = filter.type;
    if (filter.year) where.year = Number(filter.year);
    if (filter.month) where.month = Number(filter.month);
    return this.list(companyId, query, where, { populate: ['employeeId'] });
  }
}

export const bonusRepository = new BonusRepository();
