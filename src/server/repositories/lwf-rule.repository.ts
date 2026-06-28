import type { FilterQuery } from 'mongoose';
import { LWFRule, type LWFRuleDoc } from '@/models/LWFRule';
import { type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type LwfRuleFilter = {
  stateCode?: string;
  isActive?: boolean;
};

class LwfRuleRepository extends BaseRepository<LWFRuleDoc> {
  constructor() {
    super(LWFRule);
  }

  async search(companyId: string, query: ListQuery, filter: LwfRuleFilter) {
    const where: FilterQuery<LWFRuleDoc> = {};
    if (filter.stateCode) where.stateCode = filter.stateCode.toUpperCase();
    if (filter.isActive !== undefined) where.isActive = filter.isActive;

    if (query.search) {
      where.stateCode = query.search.toUpperCase();
    }

    return this.list(companyId, query, where);
  }

  /** Active rule for a state (used by the calculator). */
  async forState(companyId: string, stateCode: string): Promise<LWFRuleDoc | null> {
    return LWFRule.findOne({
      companyId,
      stateCode: stateCode.toUpperCase(),
      isActive: true,
      isDeleted: false,
    })
      .lean<LWFRuleDoc>({ virtuals: true })
      .exec();
  }
}

export const lwfRuleRepository = new LwfRuleRepository();
