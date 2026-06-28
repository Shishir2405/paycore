import type { FilterQuery } from 'mongoose';
import { Arrear, type ArrearDoc } from '@/models/Arrear';
import type { ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type ArrearFilter = {
  employeeId?: string;
  status?: string;
  year?: string;
  month?: string;
};

class ArrearRepository extends BaseRepository<ArrearDoc> {
  constructor() {
    super(Arrear);
  }

  async search(companyId: string, query: ListQuery, filter: ArrearFilter) {
    const where: FilterQuery<ArrearDoc> = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.status) where.status = filter.status;
    if (filter.year) where.year = Number(filter.year);
    if (filter.month) where.month = Number(filter.month);
    return this.list(companyId, query, where, { populate: ['employeeId'] });
  }
}

export const arrearRepository = new ArrearRepository();
