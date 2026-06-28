import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { bonusService } from '@/server/services/bonus.service';
import { bonusCreateSchema } from '@/lib/validators/payroll';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'createdAt' });
    const filter = {
      employeeId: sp.get('employeeId') ?? undefined,
      type: sp.get('type') ?? undefined,
      year: sp.get('year') ?? undefined,
      month: sp.get('month') ?? undefined,
    };
    const { data, meta } = await bonusService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('payroll', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = bonusCreateSchema.parse(await req.json());
    const bonus = await bonusService.create(auth, body, requestMeta(req));
    return created(bonus);
  },
  { permission: permission('payroll', 'create') },
);
