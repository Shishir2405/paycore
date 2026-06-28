import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { leaveTypeService } from '@/server/services/leave-type.service';
import { leaveTypeCreateSchema } from '@/lib/validators/leave';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'name' });
    const filter = { isActive: sp.get('isActive') ?? undefined };
    const { data, meta } = await leaveTypeService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('leave', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = leaveTypeCreateSchema.parse(await req.json());
    const leaveType = await leaveTypeService.create(auth, body, requestMeta(req));
    return created(leaveType);
  },
  { permission: permission('leave', 'create') },
);
