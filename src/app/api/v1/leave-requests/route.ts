import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { leaveRequestService } from '@/server/services/leave-request.service';
import { leaveRequestCreateSchema } from '@/lib/validators/leave';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'fromDate' });
    const filter = {
      status: sp.get('status') ?? undefined,
      employeeId: sp.get('employeeId') ?? undefined,
      leaveTypeId: sp.get('leaveTypeId') ?? undefined,
    };
    const { data, meta } = await leaveRequestService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('leave', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = leaveRequestCreateSchema.parse(await req.json());
    const request = await leaveRequestService.create(auth, body, requestMeta(req));
    return created(request);
  },
  { permission: permission('leave', 'create') },
);
