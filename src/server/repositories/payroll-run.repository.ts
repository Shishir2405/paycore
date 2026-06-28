import type { FilterQuery } from 'mongoose';
import { PayrollRun, type PayrollRunDoc } from '@/models/PayrollRun';
import { PayrollEntry, type PayrollEntryDoc } from '@/models/PayrollEntry';
import type { ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type PayrollRunFilter = {
  status?: string;
  year?: string;
  month?: string;
};

class PayrollRunRepository extends BaseRepository<PayrollRunDoc> {
  constructor() {
    super(PayrollRun);
  }

  async search(companyId: string, query: ListQuery, filter: PayrollRunFilter) {
    const where: FilterQuery<PayrollRunDoc> = {};
    if (filter.status) where.status = filter.status;
    if (filter.year) where.year = Number(filter.year);
    if (filter.month) where.month = Number(filter.month);
    return this.list(companyId, query, where);
  }

  /** Is there a Locked run already for this period? Blocks recalculation. */
  async lockedExists(companyId: string, month: number, year: number): Promise<boolean> {
    return this.exists(companyId, { month, year, status: 'Locked' } as FilterQuery<PayrollRunDoc>);
  }

  /** A non-locked existing run for the period (so we replace rather than dupe). */
  async findReusable(companyId: string, month: number, year: number) {
    return PayrollRun.findOne({
      companyId,
      month,
      year,
      isDeleted: false,
      status: { $in: ['Draft', 'Calculated'] },
    })
      .lean<PayrollRunDoc>({ virtuals: true })
      .exec();
  }

  // ── Entries (child collection) ──────────────────────────────────────────────

  async listEntries(companyId: string, runId: string) {
    return PayrollEntry.find({ companyId, runId, isDeleted: false })
      .sort({ employeeCode: 1 })
      .lean<PayrollEntryDoc[]>({ virtuals: true })
      .exec();
  }

  async findEntry(companyId: string, entryId: string) {
    return PayrollEntry.findOne({ _id: entryId, companyId, isDeleted: false })
      .lean<PayrollEntryDoc>({ virtuals: true })
      .exec();
  }

  /** Replace all entries for a run (used when recalculating a Draft/Calculated). */
  async replaceEntries(companyId: string, runId: string, entries: Partial<PayrollEntryDoc>[]) {
    await PayrollEntry.deleteMany({ companyId, runId }).exec();
    if (entries.length > 0) await PayrollEntry.insertMany(entries);
  }
}

export const payrollRunRepository = new PayrollRunRepository();
