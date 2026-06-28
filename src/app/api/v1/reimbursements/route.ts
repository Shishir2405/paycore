import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { reimbursementService } from '@/server/services/reimbursement.service';
import { reimbursementCreateSchema } from '@/lib/validators/benefits';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'createdAt' });
    const filter = {
      employeeId: sp.get('employeeId') ?? undefined,
      type: sp.get('type') ?? undefined,
      status: sp.get('status') ?? undefined,
    };
    const { data, meta } = await reimbursementService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('benefits', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = reimbursementCreateSchema.parse(await req.json());
    const claim = await reimbursementService.create(auth, body, requestMeta(req));
    return created(claim);
  },
  { permission: permission('benefits', 'create') },
);
