import type { FilterQuery } from 'mongoose';
import { Designation, type DesignationDoc } from '@/models/Designation';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type DesignationFilter = {
  isActive?: boolean;
  grade?: string;
};

class DesignationRepository extends BaseRepository<DesignationDoc> {
  constructor() {
    super(Designation);
  }

  /** List with debounced-search support across name and code. */
  async search(companyId: string, query: ListQuery, filter: DesignationFilter) {
    const where: FilterQuery<DesignationDoc> = {};
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.grade) where.grade = filter.grade;

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ name: rx }, { code: rx }];
    }

    return this.list(companyId, query, where);
  }
}

export const designationRepository = new DesignationRepository();
