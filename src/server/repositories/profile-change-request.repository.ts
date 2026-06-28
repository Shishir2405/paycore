import type { FilterQuery } from 'mongoose';
import { ProfileChangeRequest, type ProfileChangeRequestDoc } from '@/models/ProfileChangeRequest';
import type { ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type ProfileChangeFilter = {
  status?: string;
  employeeId?: string;
};

class ProfileChangeRequestRepository extends BaseRepository<ProfileChangeRequestDoc> {
  constructor() {
    super(ProfileChangeRequest);
  }

  /** List change requests by status / employee. */
  async search(companyId: string, query: ListQuery, filter: ProfileChangeFilter) {
    const where: FilterQuery<ProfileChangeRequestDoc> = {};
    if (filter.status) where.status = filter.status;
    if (filter.employeeId) where.employeeId = filter.employeeId;

    return this.list(companyId, query, where);
  }

  /** Count change requests matching an arbitrary (tenant-scoped) filter. */
  async collectionCount(companyId: string, filter: FilterQuery<ProfileChangeRequestDoc>): Promise<number> {
    return this.collection.countDocuments({ ...filter, companyId, isDeleted: false });
  }
}

export const profileChangeRequestRepository = new ProfileChangeRequestRepository();
