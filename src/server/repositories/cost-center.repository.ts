import type { FilterQuery } from 'mongoose';
import { CostCenter, type CostCenterDoc } from '@/models/CostCenter';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type CostCenterFilter = {
  isActive?: string;
  parentId?: string;
};

class CostCenterRepository extends BaseRepository<CostCenterDoc> {
  constructor() {
    super(CostCenter);
  }

  /** List with debounced search across name + code. */
  async search(companyId: string, query: ListQuery, filter: CostCenterFilter) {
    const where: FilterQuery<CostCenterDoc> = {};
    if (filter.isActive === 'true') where.isActive = true;
    if (filter.isActive === 'false') where.isActive = false;
    if (filter.parentId) where.parentId = filter.parentId;

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ name: rx }, { code: rx }];
    }

    return this.list(companyId, query, where, { populate: 'parentId' });
  }
}

export const costCenterRepository = new CostCenterRepository();
