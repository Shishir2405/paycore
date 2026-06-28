import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { payHeadService } from '@/server/services/pay-head.service';
import { payHeadCreateSchema } from '@/lib/validators/pay-head';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'displayOrder', limit: 100 });
    const filter = {
      type: sp.get('type') ?? undefined,
      calcType: sp.get('calcType') ?? undefined,
      isActive: sp.get('isActive') ?? undefined,
    };
    const { data, meta } = await payHeadService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('payheads', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = payHeadCreateSchema.parse(await req.json());
    const payHead = await payHeadService.create(auth, body, requestMeta(req));
    return created(payHead);
  },
  { permission: permission('payheads', 'create') },
);
