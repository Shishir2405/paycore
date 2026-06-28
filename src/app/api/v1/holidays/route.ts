import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { holidayService } from '@/server/services/holiday.service';
import { holidayCreateSchema } from '@/lib/validators/holiday';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'date', limit: 50 });
    const filter = { type: sp.get('type') ?? undefined, year: sp.get('year') ?? undefined };
    const { data, meta } = await holidayService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('attendance', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = holidayCreateSchema.parse(await req.json());
    const holiday = await holidayService.create(auth, body, requestMeta(req));
    return created(holiday);
  },
  { permission: permission('attendance', 'create') },
);
