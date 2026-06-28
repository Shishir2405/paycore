import type { FilterQuery } from 'mongoose';
import { Shift, type ShiftDoc } from '@/models/Shift';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type ShiftFilter = {
  isActive?: string;
};

class ShiftRepository extends BaseRepository<ShiftDoc> {
  constructor() {
    super(Shift);
  }

  /** List with search across name + code. */
  async search(companyId: string, query: ListQuery, filter: ShiftFilter) {
    const where: FilterQuery<ShiftDoc> = {};
    if (filter.isActive === 'true') where.isActive = true;
    if (filter.isActive === 'false') where.isActive = false;

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ name: rx }, { code: rx }];
    }

    return this.list(companyId, query, where);
  }
}

export const shiftRepository = new ShiftRepository();
