import type { FilterQuery } from 'mongoose';
import { BankFile, type BankFileDoc } from '@/models/BankFile';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type BankFileFilter = {
  format?: string;
  payrollRunId?: string;
};

class BankFileRepository extends BaseRepository<BankFileDoc> {
  constructor() {
    super(BankFile);
  }

  /** List with search across file name. */
  async search(companyId: string, query: ListQuery, filter: BankFileFilter) {
    const where: FilterQuery<BankFileDoc> = {};
    if (filter.format) where.format = filter.format;
    if (filter.payrollRunId) where.payrollRunId = filter.payrollRunId;

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ fileName: rx }];
    }

    return this.list(companyId, query, where);
  }
}

export const bankFileRepository = new BankFileRepository();
