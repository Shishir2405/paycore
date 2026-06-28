import type { FilterQuery } from 'mongoose';
import { HelpdeskTicket, type HelpdeskTicketDoc } from '@/models/HelpdeskTicket';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type HelpdeskCountFilter = FilterQuery<HelpdeskTicketDoc>;

export type HelpdeskFilter = {
  status?: string;
  category?: string;
  employeeId?: string;
};

class HelpdeskTicketRepository extends BaseRepository<HelpdeskTicketDoc> {
  constructor() {
    super(HelpdeskTicket);
  }

  /** List with status / category / employee filters and subject search. */
  async search(companyId: string, query: ListQuery, filter: HelpdeskFilter) {
    const where: FilterQuery<HelpdeskTicketDoc> = {};
    if (filter.status) where.status = filter.status;
    if (filter.category) where.category = filter.category;
    if (filter.employeeId) where.employeeId = filter.employeeId;

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ subject: rx }, { message: rx }, { ticketNumber: rx }];
    }

    return this.list(companyId, query, where);
  }

  /** Count tickets matching an arbitrary (already tenant-scoped) filter. */
  async collectionCount(companyId: string, filter: HelpdeskCountFilter): Promise<number> {
    return this.collection.countDocuments({ ...filter, companyId, isDeleted: false });
  }

  /** Next sequential ticket number, e.g. TKT-0001. */
  async nextTicketNumber(companyId: string, prefix = 'TKT'): Promise<string> {
    const last = await HelpdeskTicket.findOne({ companyId, ticketNumber: new RegExp(`^${prefix}-`) })
      .sort({ createdAt: -1 })
      .select('ticketNumber')
      .lean()
      .exec();
    const lastNum = last ? Number.parseInt(last.ticketNumber.split('-')[1] ?? '0', 10) : 0;
    const next = Number.isFinite(lastNum) ? lastNum + 1 : 1;
    return `${prefix}-${String(next).padStart(4, '0')}`;
  }
}

export const helpdeskTicketRepository = new HelpdeskTicketRepository();
