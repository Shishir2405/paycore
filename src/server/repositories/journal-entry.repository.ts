import type { FilterQuery } from 'mongoose';
import { JournalEntry, type JournalEntryDoc } from '@/models/JournalEntry';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type JournalEntryFilter = {
  source?: string;
  payrollRunId?: string;
};

class JournalEntryRepository extends BaseRepository<JournalEntryDoc> {
  constructor() {
    super(JournalEntry);
  }

  /** List with search across voucher number + narration. */
  async search(companyId: string, query: ListQuery, filter: JournalEntryFilter) {
    const where: FilterQuery<JournalEntryDoc> = {};
    if (filter.source) where.source = filter.source;
    if (filter.payrollRunId) where.payrollRunId = filter.payrollRunId;

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ voucherNo: rx }, { narration: rx }];
    }

    return this.list(companyId, query, where);
  }

  /** Next sequential voucher number, e.g. JV-0001. */
  async nextVoucherNo(companyId: string, prefix = 'JV'): Promise<string> {
    const last = await JournalEntry.findOne({ companyId, voucherNo: new RegExp(`^${prefix}-`) })
      .sort({ createdAt: -1 })
      .select('voucherNo')
      .lean()
      .exec();
    const lastNum = last ? Number.parseInt(last.voucherNo.split('-')[1] ?? '0', 10) : 0;
    const next = Number.isFinite(lastNum) ? lastNum + 1 : 1;
    return `${prefix}-${String(next).padStart(4, '0')}`;
  }
}

export const journalEntryRepository = new JournalEntryRepository();
