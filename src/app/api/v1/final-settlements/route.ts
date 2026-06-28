import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { finalSettlementService } from '@/server/services/final-settlement.service';
import { finalSettlementCreateSchema } from '@/lib/validators/payroll';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'createdAt' });
    const filter = {
      employeeId: sp.get('employeeId') ?? undefined,
      status: sp.get('status') ?? undefined,
    };
    const { data, meta } = await finalSettlementService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('payroll', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = finalSettlementCreateSchema.parse(await req.json());
    const settlement = await finalSettlementService.create(auth, body, requestMeta(req));
    return created(settlement);
  },
  { permission: permission('payroll', 'create') },
);
