import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { arrearService } from '@/server/services/arrear.service';
import { arrearCreateSchema } from '@/lib/validators/payroll';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'createdAt' });
    const filter = {
      employeeId: sp.get('employeeId') ?? undefined,
      status: sp.get('status') ?? undefined,
      year: sp.get('year') ?? undefined,
      month: sp.get('month') ?? undefined,
    };
    const { data, meta } = await arrearService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('payroll', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = arrearCreateSchema.parse(await req.json());
    const arrear = await arrearService.create(auth, body, requestMeta(req));
    return created(arrear);
  },
  { permission: permission('payroll', 'create') },
);
