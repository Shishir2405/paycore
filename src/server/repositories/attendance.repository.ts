import type { FilterQuery } from 'mongoose';
import { Attendance, type AttendanceDoc } from '@/models/Attendance';
import { type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type AttendanceFilter = {
  employeeId?: string;
  status?: string;
  /** ISO date (YYYY-MM-DD) lower/upper bounds, inclusive. */
  from?: string;
  to?: string;
};

class AttendanceRepository extends BaseRepository<AttendanceDoc> {
  constructor() {
    super(Attendance);
  }

  /** List with employee/status/date-range filters, populating the employee. */
  async search(companyId: string, query: ListQuery, filter: AttendanceFilter) {
    const where: FilterQuery<AttendanceDoc> = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.status) where.status = filter.status;

    const range = buildDateRange(filter.from, filter.to);
    if (range) where.date = range;

    return this.list(companyId, query, where, {
      populate: ['employeeId'],
    });
  }

  /** Find an existing record for an employee on a specific day (for upserts). */
  async findForDay(companyId: string, employeeId: string, date: Date) {
    return this.findOne(companyId, { employeeId, date } as FilterQuery<AttendanceDoc>);
  }
}

function buildDateRange(from?: string, to?: string): { $gte?: Date; $lte?: Date } | undefined {
  const out: { $gte?: Date; $lte?: Date } = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) out.$gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) out.$lte = d;
  }
  return out.$gte || out.$lte ? out : undefined;
}

export const attendanceRepository = new AttendanceRepository();
