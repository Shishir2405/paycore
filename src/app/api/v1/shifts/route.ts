import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { shiftService } from '@/server/services/shift.service';
import { shiftCreateSchema } from '@/lib/validators/shift';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'code' });
    const filter = { isActive: sp.get('isActive') ?? undefined };
    const { data, meta } = await shiftService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('attendance', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = shiftCreateSchema.parse(await req.json());
    const shift = await shiftService.create(auth, body, requestMeta(req));
    return created(shift);
  },
  { permission: permission('attendance', 'create') },
);
