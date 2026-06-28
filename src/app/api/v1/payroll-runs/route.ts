import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { payrollService } from '@/server/services/payroll.service';
import { payrollRunCreateSchema } from '@/lib/validators/payroll';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'createdAt' });
    const filter = {
      status: sp.get('status') ?? undefined,
      year: sp.get('year') ?? undefined,
      month: sp.get('month') ?? undefined,
    };
    const { data, meta } = await payrollService.listRuns(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('payroll', 'view') },
);

/** POST = calculate (run the engine for the given month/year). */
export const POST = withRoute(
  async ({ req, auth }) => {
    const body = payrollRunCreateSchema.parse(await req.json());
    const result = await payrollService.calculate(auth, body, requestMeta(req));
    return created(result);
  },
  { permission: permission('payroll', 'create') },
);
