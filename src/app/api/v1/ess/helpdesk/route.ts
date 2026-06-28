import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { essService } from '@/server/services/ess.service';
import { helpdeskCreateSchema } from '@/lib/validators/ess';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'createdAt' });
    const filter = {
      status: sp.get('status') ?? undefined,
      category: sp.get('category') ?? undefined,
    };
    const { data, meta } = await essService.listTickets(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('ess', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = helpdeskCreateSchema.parse(await req.json());
    const ticket = await essService.createTicket(auth, body, requestMeta(req));
    return created(ticket);
  },
  { permission: permission('ess', 'create') },
);
