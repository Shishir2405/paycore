import type { FilterQuery } from 'mongoose';
import { Holiday, type HolidayDoc } from '@/models/Holiday';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type HolidayFilter = {
  type?: string;
  year?: string;
};

class HolidayRepository extends BaseRepository<HolidayDoc> {
  constructor() {
    super(Holiday);
  }

  /** List with search across name + state, optionally scoped to a year. */
  async search(companyId: string, query: ListQuery, filter: HolidayFilter) {
    const where: FilterQuery<HolidayDoc> = {};
    if (filter.type) where.type = filter.type;

    const year = filter.year ? Number.parseInt(filter.year, 10) : undefined;
    if (year && Number.isFinite(year)) {
      where.date = { $gte: new Date(Date.UTC(year, 0, 1)), $lt: new Date(Date.UTC(year + 1, 0, 1)) };
    }

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ name: rx }, { state: rx }, { location: rx }];
    }

    return this.list(companyId, query, where);
  }
}

export const holidayRepository = new HolidayRepository();
