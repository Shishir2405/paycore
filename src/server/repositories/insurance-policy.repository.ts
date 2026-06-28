import type { FilterQuery } from 'mongoose';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { InsurancePolicy, type InsurancePolicyDoc } from '@/models/InsurancePolicy';
import { BaseRepository } from './base.repository';

export type InsurancePolicyFilter = {
  employeeId?: string;
};

class InsurancePolicyRepository extends BaseRepository<InsurancePolicyDoc> {
  constructor() {
    super(InsurancePolicy);
  }

  async search(companyId: string, query: ListQuery, filter: InsurancePolicyFilter) {
    const where: FilterQuery<InsurancePolicyDoc> = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ policyNo: rx }, { provider: rx }];
    }

    return this.list(companyId, query, where, { populate: ['employeeId'] });
  }
}

export const insurancePolicyRepository = new InsurancePolicyRepository();
