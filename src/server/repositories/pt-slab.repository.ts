import type { FilterQuery } from 'mongoose';
import { PTSlab, type PTSlabDoc } from '@/models/PTSlab';
import { type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type PtSlabFilter = {
  stateCode?: string;
  isActive?: boolean;
};

class PtSlabRepository extends BaseRepository<PTSlabDoc> {
  constructor() {
    super(PTSlab);
  }

  async search(companyId: string, query: ListQuery, filter: PtSlabFilter) {
    const where: FilterQuery<PTSlabDoc> = {};
    if (filter.stateCode) where.stateCode = filter.stateCode.toUpperCase();
    if (filter.isActive !== undefined) where.isActive = filter.isActive;

    if (query.search) {
      where.stateCode = query.search.toUpperCase();
    }

    return this.list(companyId, query, where);
  }

  /** All active slabs for a state (used by the calculator). */
  async forState(companyId: string, stateCode: string): Promise<PTSlabDoc[]> {
    return PTSlab.find({
      companyId,
      stateCode: stateCode.toUpperCase(),
      isActive: true,
      isDeleted: false,
    })
      .sort({ fromAmount: 1 })
      .lean<PTSlabDoc[]>({ virtuals: true })
      .exec();
  }
}

export const ptSlabRepository = new PtSlabRepository();
