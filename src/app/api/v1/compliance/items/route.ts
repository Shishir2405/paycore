import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { complianceService } from '@/server/services/compliance.service';
import { complianceItemCreateSchema } from '@/lib/validators/compliance';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'dueDate' });
    const filter = {
      type: sp.get('type') ?? undefined,
      status: sp.get('status') ?? undefined,
      period: sp.get('period') ?? undefined,
    };
    const { data, meta } = await complianceService.listItems(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('compliance', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = complianceItemCreateSchema.parse(await req.json());
    const item = await complianceService.createItem(auth, body, requestMeta(req));
    return created(item);
  },
  { permission: permission('compliance', 'create') },
);
