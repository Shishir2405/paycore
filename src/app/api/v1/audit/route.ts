import { withRoute } from '@/server/middlewares/with-route';
import { ok, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { permission } from '@/lib/rbac/permissions';
import { auditService } from '@/server/services/audit.service';
import { auditFilterSchema } from '@/lib/validators/audit';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;

    // `?facet=modules` returns the distinct module keys for the filter dropdown.
    if (sp.get('facet') === 'modules') {
      const modules = await auditService.modules(auth);
      return ok(modules);
    }

    const query = parseListQuery(sp, { sortBy: 'createdAt' });
    const filter = auditFilterSchema.parse({
      module: sp.get('module') ?? undefined,
      action: sp.get('action') ?? undefined,
      actorId: sp.get('actorId') ?? undefined,
      from: sp.get('from') ?? undefined,
      to: sp.get('to') ?? undefined,
    });

    const { data, meta } = await auditService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('audit', 'view') },
);
