import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { attendanceService } from '@/server/services/attendance.service';
import { attendanceCreateSchema } from '@/lib/validators/attendance';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'date' });
    const filter = {
      employeeId: sp.get('employeeId') ?? undefined,
      status: sp.get('status') ?? undefined,
      from: sp.get('from') ?? undefined,
      to: sp.get('to') ?? undefined,
    };
    const { data, meta } = await attendanceService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('attendance', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = attendanceCreateSchema.parse(await req.json());
    const record = await attendanceService.upsert(auth, body, requestMeta(req));
    return created(record);
  },
  { permission: permission('attendance', 'create') },
);
