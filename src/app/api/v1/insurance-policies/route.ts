import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { insurancePolicyService } from '@/server/services/insurance-policy.service';
import { insurancePolicyCreateSchema } from '@/lib/validators/benefits';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'createdAt' });
    const filter = { employeeId: sp.get('employeeId') ?? undefined };
    const { data, meta } = await insurancePolicyService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('benefits', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = insurancePolicyCreateSchema.parse(await req.json());
    const policy = await insurancePolicyService.create(auth, body, requestMeta(req));
    return created(policy);
  },
  { permission: permission('benefits', 'create') },
);
