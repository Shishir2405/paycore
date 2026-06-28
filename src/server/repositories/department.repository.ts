import type { FilterQuery } from 'mongoose';
import { Department, type DepartmentDoc } from '@/models/Department';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type DepartmentFilter = {
  isActive?: boolean;
  parentId?: string;
};

class DepartmentRepository extends BaseRepository<DepartmentDoc> {
  constructor() {
    super(Department);
  }

  /** List with debounced-search support across name and code. */
  async search(companyId: string, query: ListQuery, filter: DepartmentFilter) {
    const where: FilterQuery<DepartmentDoc> = {};
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.parentId) where.parentId = filter.parentId;

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ name: rx }, { code: rx }];
    }

    return this.list(companyId, query, where, { populate: ['parentId'] });
  }
}

export const departmentRepository = new DepartmentRepository();
