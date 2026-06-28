import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { essService } from '@/server/services/ess.service';
import { profileChangeCreateSchema } from '@/lib/validators/ess';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'createdAt' });
    const filter = { status: sp.get('status') ?? undefined };
    const { data, meta } = await essService.listProfileRequests(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('ess', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = profileChangeCreateSchema.parse(await req.json());
    const request = await essService.createProfileRequest(auth, body, requestMeta(req));
    return created(request);
  },
  { permission: permission('ess', 'create') },
);
