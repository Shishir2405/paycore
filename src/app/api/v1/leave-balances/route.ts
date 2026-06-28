import { withRoute } from '@/server/middlewares/with-route';
import { paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { permission } from '@/lib/rbac/permissions';
import { leaveBalanceService } from '@/server/services/leave-balance.service';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'year' });
    const filter = {
      employeeId: sp.get('employeeId') ?? undefined,
      leaveTypeId: sp.get('leaveTypeId') ?? undefined,
      year: sp.get('year') ?? undefined,
    };
    const { data, meta } = await leaveBalanceService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('leave', 'view') },
);
