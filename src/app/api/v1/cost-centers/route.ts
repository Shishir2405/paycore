import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { costCenterService } from '@/server/services/cost-center.service';
import { costCenterCreateSchema } from '@/lib/validators/finance';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'code' });
    const filter = {
      isActive: sp.get('isActive') ?? undefined,
      parentId: sp.get('parentId') ?? undefined,
    };
    const { data, meta } = await costCenterService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('finance', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = costCenterCreateSchema.parse(await req.json());
    const costCenter = await costCenterService.create(auth, body, requestMeta(req));
    return created(costCenter);
  },
  { permission: permission('finance', 'create') },
);
