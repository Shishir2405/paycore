import type { FilterQuery } from 'mongoose';
import { PayHead, type PayHeadDoc } from '@/models/PayHead';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type PayHeadFilter = {
  type?: string;
  calcType?: string;
  isActive?: string;
};

class PayHeadRepository extends BaseRepository<PayHeadDoc> {
  constructor() {
    super(PayHead);
  }

  /** List with debounced-search across name + code, plus type/active filters. */
  async search(companyId: string, query: ListQuery, filter: PayHeadFilter) {
    const where: FilterQuery<PayHeadDoc> = {};
    if (filter.type) where.type = filter.type;
    if (filter.calcType) where.calcType = filter.calcType;
    if (filter.isActive === 'true') where.isActive = true;
    if (filter.isActive === 'false') where.isActive = false;

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ name: rx }, { code: rx }];
    }

    return this.list(companyId, query, where);
  }

  /** All active pay heads for a tenant — used by the payroll engine. */
  async listActive(companyId: string) {
    return PayHead.find({ companyId, isDeleted: false, isActive: true })
      .sort({ type: 1, displayOrder: 1 })
      .lean<PayHeadDoc[]>({ virtuals: true })
      .exec();
  }
}

export const payHeadRepository = new PayHeadRepository();
