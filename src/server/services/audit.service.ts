/**
 * Audit-trail domain logic: tenant-scoped listing with filters (module, action,
 * actor, date range), a safe public mapper, and CSV export. The trail itself is
 * written elsewhere (lib/audit/log) — this service is read + export only. Even
 * the export action records its own audit entry for traceability.
 */
import type { AuditLogDoc } from '@/models/AuditLog';
import { auditRepository, type AuditFilter } from '@/server/repositories/audit.repository';
import { recordAudit } from '@/lib/audit/log';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import { toCsv, type Column } from '@/lib/utils/tabular';
import type { AuthContext } from '@/types';
import type { AuditFilterInput } from '@/lib/validators/audit';

/** Plain-JSON shape returned by the API (string ids, ISO timestamps). */
export type PublicAuditLog = {
  id: string;
  timestamp: Date;
  actorId: string | null;
  actorName: string;
  action: string;
  module: string;
  entityId?: string;
  summary: string;
  changeCount: number;
  ip?: string;
  userAgent?: string;
};

function toPublic(doc: Record<string, unknown>): PublicAuditLog {
  const d = doc as unknown as AuditLogDoc & { _id: unknown };
  return {
    id: String(d._id),
    timestamp: d.createdAt,
    actorId: d.actorId ? String(d.actorId) : null,
    actorName: d.actorName,
    action: d.action,
    module: d.module,
    entityId: d.entityId,
    summary: d.summary,
    changeCount: Array.isArray(d.changes) ? d.changes.length : 0,
    ip: d.ip,
    userAgent: d.userAgent,
  };
}

const EXPORT_COLUMNS: Column<PublicAuditLog>[] = [
  { key: 'timestamp', header: 'Timestamp', format: (r) => (r.timestamp ? new Date(r.timestamp).toISOString() : '') },
  { key: 'actorName', header: 'Actor' },
  { key: 'action', header: 'Action' },
  { key: 'module', header: 'Module' },
  { key: 'entityId', header: 'Entity' },
  { key: 'summary', header: 'Summary' },
  { key: 'changeCount', header: 'Changes' },
  { key: 'ip', header: 'IP' },
];

/** Map validated filter input to the repository filter shape. */
function toFilter(input: AuditFilterInput): AuditFilter {
  return {
    module: input.module || undefined,
    action: input.action || undefined,
    actorId: input.actorId || undefined,
    from: input.from,
    to: input.to,
  };
}

export const auditService = {
  async list(ctx: AuthContext, query: ListQuery, input: AuditFilterInput) {
    const { rows, total } = await auditRepository.search(ctx.companyId, query, toFilter(input));
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  /** Module keys seen in this tenant's trail — powers the filter dropdown. */
  async modules(ctx: AuthContext): Promise<string[]> {
    return auditRepository.distinctModules(ctx.companyId);
  },

  /** Export the full filtered set as CSV (records its own audit entry). */
  async export(ctx: AuthContext, query: ListQuery, input: AuditFilterInput) {
    const rows = await auditRepository.findAll(
      ctx.companyId,
      { ...query, skip: 0, limit: 100_000 },
      toFilter(input),
    );
    const data = rows.map((r) => toPublic(r as Record<string, unknown>));
    await recordAudit(ctx, {
      action: 'export',
      module: 'audit',
      summary: `Exported ${data.length} audit log entries`,
    });
    return { kind: 'csv' as const, content: toCsv(data, EXPORT_COLUMNS) };
  },
};
