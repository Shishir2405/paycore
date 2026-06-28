import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { loanService } from '@/server/services/loan.service';
import { loanCreateSchema } from '@/lib/validators/benefits';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'createdAt' });
    const filter = {
      employeeId: sp.get('employeeId') ?? undefined,
      status: sp.get('status') ?? undefined,
    };
    const { data, meta } = await loanService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('benefits', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = loanCreateSchema.parse(await req.json());
    const loan = await loanService.create(auth, body, requestMeta(req));
    return created(loan);
  },
  { permission: permission('benefits', 'create') },
);
