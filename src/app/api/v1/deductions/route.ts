import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { deductionService } from '@/server/services/deduction.service';
import { deductionCreateSchema } from '@/lib/validators/benefits';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'createdAt' });
    const recurringParam = sp.get('recurring');
    const filter = {
      employeeId: sp.get('employeeId') ?? undefined,
      recurring: recurringParam === null ? undefined : recurringParam === 'true',
      month: sp.get('month') ?? undefined,
    };
    const { data, meta } = await deductionService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('benefits', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = deductionCreateSchema.parse(await req.json());
    const deduction = await deductionService.create(auth, body, requestMeta(req));
    return created(deduction);
  },
  { permission: permission('benefits', 'create') },
);
