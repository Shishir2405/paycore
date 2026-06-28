/**
 * Audit-trail reads. The AuditLog collection is append-only (no soft-delete, no
 * updates) so it does NOT use BaseRepository's isDeleted scoping — but it stays
 * strictly tenant-scoped to companyId like every other repository. Reads only:
 * the trail is written exclusively via lib/audit/log.recordAudit.
 */
import type { FilterQuery, SortOrder } from 'mongoose';
import { AuditLog, type AuditLogDoc } from '@/models/AuditLog';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';

export type AuditFilter = {
  module?: string;
  action?: string;
  actorId?: string;
  from?: Date;
  to?: Date;
};

export type AuditListResult = { rows: AuditLogDoc[]; total: number };

class AuditRepository {
  /** Build a tenant-scoped Mongo filter from the typed list filters + search. */
  private where(companyId: string, query: ListQuery, filter: AuditFilter): FilterQuery<AuditLogDoc> {
    const where: FilterQuery<AuditLogDoc> = { companyId };
    if (filter.module) where.module = filter.module;
    if (filter.action) where.action = filter.action;
    if (filter.actorId) where.actorId = filter.actorId;

    if (filter.from || filter.to) {
      const range: Record<string, Date> = {};
      if (filter.from) range.$gte = filter.from;
      if (filter.to) range.$lte = filter.to;
      where.createdAt = range;
    }

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.$or = [{ actorName: rx }, { summary: rx }, { entityId: rx }];
    }

    return where;
  }

  /** Paginated, sorted, tenant-scoped slice of the trail. */
  async search(companyId: string, query: ListQuery, filter: AuditFilter): Promise<AuditListResult> {
    const where = this.where(companyId, query, filter);
    const sort: Record<string, SortOrder> = { [query.sortBy]: query.sortDir };

    const [rows, total] = await Promise.all([
      AuditLog.find(where)
        .sort(sort)
        .skip(query.skip)
        .limit(query.limit)
        .lean<AuditLogDoc[]>()
        .exec(),
      AuditLog.countDocuments(where),
    ]);

    return { rows, total };
  }

  /** Full filtered set (for export) — bounded to avoid unbounded streams. */
  async findAll(companyId: string, query: ListQuery, filter: AuditFilter, max = 100_000): Promise<AuditLogDoc[]> {
    const where = this.where(companyId, query, filter);
    const sort: Record<string, SortOrder> = { [query.sortBy]: query.sortDir };
    return AuditLog.find(where).sort(sort).limit(max).lean<AuditLogDoc[]>().exec();
  }

  /** Distinct module keys present in this tenant's trail (for the filter dropdown). */
  async distinctModules(companyId: string): Promise<string[]> {
    const values = await AuditLog.distinct('module', { companyId }).exec();
    return (values as string[]).filter(Boolean).sort();
  }
}

export const auditRepository = new AuditRepository();
