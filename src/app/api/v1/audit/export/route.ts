import { withRoute } from '@/server/middlewares/with-route';
import { parseListQuery } from '@/lib/utils/pagination';
import { permission } from '@/lib/rbac/permissions';
import { auditService } from '@/server/services/audit.service';
import { auditFilterSchema } from '@/lib/validators/audit';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'createdAt' });
    const filter = auditFilterSchema.parse({
      module: sp.get('module') ?? undefined,
      action: sp.get('action') ?? undefined,
      actorId: sp.get('actorId') ?? undefined,
      from: sp.get('from') ?? undefined,
      to: sp.get('to') ?? undefined,
    });

    const result = await auditService.export(auth, query, filter);
    const stamp = new Date().toISOString().slice(0, 10);

    return new Response(result.content, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-trail-${stamp}.csv"`,
      },
    });
  },
  { permission: permission('audit', 'export') },
);
