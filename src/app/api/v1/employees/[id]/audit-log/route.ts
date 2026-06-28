import { withRoute } from '@/server/middlewares/with-route';
import { paginated } from '@/lib/utils/api-response';
import { parseListQuery, buildPageMeta } from '@/lib/utils/pagination';
import { permission } from '@/lib/rbac/permissions';
import { AuditLog } from '@/models/AuditLog';

export const runtime = 'nodejs';

type Params = { id: string };

/** Audit trail for a single employee — every module exposes this same shape. */
export const GET = withRoute<Params>(
  async ({ req, auth, params }) => {
    const query = parseListQuery(req.nextUrl.searchParams);
    const where = { companyId: auth.companyId, module: 'employees', entityId: params.id };

    const [rows, total] = await Promise.all([
      AuditLog.find(where).sort({ createdAt: -1 }).skip(query.skip).limit(query.limit).lean().exec(),
      AuditLog.countDocuments(where),
    ]);

    return paginated(rows, buildPageMeta(query.page, query.limit, total));
  },
  { permission: permission('audit', 'view') },
);
