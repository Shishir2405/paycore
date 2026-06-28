import type { FilterQuery } from 'mongoose';
import { SalaryStructure, type SalaryStructureDoc } from '@/models/SalaryStructure';
import type { ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type SalaryStructureFilter = {
  employeeId?: string;
  isActive?: string;
};

class SalaryStructureRepository extends BaseRepository<SalaryStructureDoc> {
  constructor() {
    super(SalaryStructure);
  }

  async search(companyId: string, query: ListQuery, filter: SalaryStructureFilter) {
    const where: FilterQuery<SalaryStructureDoc> = {};
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.isActive === 'true') where.isActive = true;
    if (filter.isActive === 'false') where.isActive = false;
    return this.list(companyId, query, where, { populate: ['employeeId'] });
  }

  /** The currently-active structure for an employee (engine + edit screens). */
  async findActiveForEmployee(companyId: string, employeeId: string) {
    return SalaryStructure.findOne({ companyId, employeeId, isActive: true, isDeleted: false })
      .sort({ version: -1 })
      .lean<SalaryStructureDoc>({ virtuals: true })
      .exec();
  }

  /** Highest version number recorded for an employee (0 when none). */
  async latestVersion(companyId: string, employeeId: string): Promise<number> {
    const last = await SalaryStructure.findOne({ companyId, employeeId, isDeleted: false })
      .sort({ version: -1 })
      .select('version')
      .lean()
      .exec();
    return last?.version ?? 0;
  }

  /** Deactivate every active structure for an employee (before a new version). */
  async deactivateAll(companyId: string, employeeId: string, actorId?: string) {
    await SalaryStructure.updateMany(
      { companyId, employeeId, isActive: true, isDeleted: false },
      { isActive: false, updatedBy: actorId ?? null },
    ).exec();
  }
}

export const salaryStructureRepository = new SalaryStructureRepository();
