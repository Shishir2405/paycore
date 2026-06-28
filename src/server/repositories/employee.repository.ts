import type { FilterQuery } from 'mongoose';
import { Employee, type EmployeeDoc } from '@/models/Employee';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type EmployeeFilter = {
  status?: string;
  departmentId?: string;
  designationId?: string;
};

class EmployeeRepository extends BaseRepository<EmployeeDoc> {
  constructor() {
    super(Employee);
  }

  /** List with debounced-search support across code, name, and email. */
  async search(companyId: string, query: ListQuery, filter: EmployeeFilter) {
    const where: FilterQuery<EmployeeDoc> = {};
    if (filter.status) where.status = filter.status;
    if (filter.departmentId) where.departmentId = filter.departmentId;
    if (filter.designationId) where.designationId = filter.designationId;

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ employeeCode: rx }, { firstName: rx }, { lastName: rx }, { email: rx }];
    }

    return this.list(companyId, query, where, {
      populate: ['departmentId', 'designationId'],
    });
  }

  /** Next sequential employee code, e.g. EMP-0001. */
  async nextEmployeeCode(companyId: string, prefix = 'EMP'): Promise<string> {
    const last = await Employee.findOne({ companyId, employeeCode: new RegExp(`^${prefix}-`) })
      .sort({ createdAt: -1 })
      .select('employeeCode')
      .lean()
      .exec();
    const lastNum = last ? Number.parseInt(last.employeeCode.split('-')[1] ?? '0', 10) : 0;
    const next = Number.isFinite(lastNum) ? lastNum + 1 : 1;
    return `${prefix}-${String(next).padStart(4, '0')}`;
  }

  /** With sensitive (select:false) fields included — service decrypts as needed. */
  async findByIdWithSecrets(companyId: string, id: string) {
    return Employee.findOne({ _id: id, companyId, isDeleted: false })
      .select('+panEnc +aadhaarEnc +bank.accountNumberEnc')
      .lean()
      .exec();
  }
}

export const employeeRepository = new EmployeeRepository();
