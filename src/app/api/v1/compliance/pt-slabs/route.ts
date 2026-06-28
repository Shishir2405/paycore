import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { complianceService } from '@/server/services/compliance.service';
import { ptSlabCreateSchema } from '@/lib/validators/compliance';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'fromAmount', limit: 50 });
    const activeParam = sp.get('isActive');
    const filter = {
      stateCode: sp.get('stateCode') ?? undefined,
      isActive: activeParam === null ? undefined : activeParam === 'true',
    };
    const { data, meta } = await complianceService.listPtSlabs(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('compliance', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = ptSlabCreateSchema.parse(await req.json());
    const slab = await complianceService.createPtSlab(auth, body, requestMeta(req));
    return created(slab);
  },
  { permission: permission('compliance', 'create') },
);
