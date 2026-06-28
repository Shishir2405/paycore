import type { FilterQuery } from 'mongoose';
import { ComplianceItem, type ComplianceItemDoc } from '@/models/ComplianceItem';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type ComplianceItemFilter = {
  type?: string;
  status?: string;
  period?: string;
};

class ComplianceItemRepository extends BaseRepository<ComplianceItemDoc> {
  constructor() {
    super(ComplianceItem);
  }

  /** Calendar list with type/status/period filters + period/reference search. */
  async search(companyId: string, query: ListQuery, filter: ComplianceItemFilter) {
    const where: FilterQuery<ComplianceItemDoc> = {};
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.period) where.period = filter.period;

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ period: rx }, { reference: rx }, { notes: rx }];
    }

    return this.list(companyId, query, where);
  }
}

export const complianceItemRepository = new ComplianceItemRepository();
