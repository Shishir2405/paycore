import type { FilterQuery } from 'mongoose';
import { Loan, type LoanDoc } from '@/models/Loan';
import { LoanRepayment, type LoanRepaymentDoc } from '@/models/LoanRepayment';
import type { ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type LoanFilter = {
  employeeId?: string;
  status?: string;
};

class LoanRepository extends BaseRepository<LoanDoc> {
  constructor() {
    super(Loan);
  }

  async search(companyId: string, query: ListQuery, filter: LoanFilter) {
    const where: FilterQuery<LoanDoc> = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.status) where.status = filter.status;

    return this.list(companyId, query, where, { populate: ['employeeId'] });
  }

  /** Persist the generated amortization rows for a loan. */
  async insertSchedule(rows: Partial<LoanRepaymentDoc>[]): Promise<void> {
    if (rows.length === 0) return;
    await LoanRepayment.insertMany(rows);
  }

  /** Ordered installment schedule for a single loan. */
  async schedule(companyId: string, loanId: string): Promise<LoanRepaymentDoc[]> {
    return LoanRepayment.find({ companyId, loanId, isDeleted: false })
      .sort({ monthIndex: 1 })
      .lean<LoanRepaymentDoc[]>({ virtuals: true })
      .exec();
  }

  /** Hard-remove schedule rows when a loan is deleted (they have no value alone). */
  async deleteSchedule(companyId: string, loanId: string): Promise<void> {
    await LoanRepayment.updateMany(
      { companyId, loanId },
      { isDeleted: true },
    ).exec();
  }
}

export const loanRepository = new LoanRepository();
