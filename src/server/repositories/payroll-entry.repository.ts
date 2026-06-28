import { PayrollEntry, type PayrollEntryDoc } from '@/models/PayrollEntry';
import { type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

class PayrollEntryRepository extends BaseRepository<PayrollEntryDoc> {
  constructor() {
    super(PayrollEntry);
  }

  /** Paginated entries for a run (detail view / payslip list). */
  async forRun(companyId: string, runId: string, query: ListQuery) {
    return this.list(companyId, query, { runId }, { populate: [] });
  }

  /** All entries for a run, unpaginated — used by report builders. */
  async allForRun(companyId: string, runId: string): Promise<PayrollEntryDoc[]> {
    return PayrollEntry.find({ companyId, runId, isDeleted: false })
      .sort({ employeeCode: 1 })
      .lean<PayrollEntryDoc[]>({ virtuals: true })
      .exec();
  }

  async insertMany(docs: Partial<PayrollEntryDoc>[]): Promise<void> {
    if (docs.length === 0) return;
    await PayrollEntry.insertMany(docs);
  }

  /** Hard-delete all entries for a run (used when re-calculating a draft). */
  async deleteForRun(companyId: string, runId: string): Promise<void> {
    await PayrollEntry.deleteMany({ companyId, runId }).exec();
  }
}

export const payrollEntryRepository = new PayrollEntryRepository();
