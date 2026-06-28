import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { complianceService } from '@/server/services/compliance.service';
import { lwfRuleCreateSchema } from '@/lib/validators/compliance';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'stateCode', limit: 50 });
    const activeParam = sp.get('isActive');
    const filter = {
      stateCode: sp.get('stateCode') ?? undefined,
      isActive: activeParam === null ? undefined : activeParam === 'true',
    };
    const { data, meta } = await complianceService.listLwfRules(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('compliance', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = lwfRuleCreateSchema.parse(await req.json());
    const rule = await complianceService.createLwfRule(auth, body, requestMeta(req));
    return created(rule);
  },
  { permission: permission('compliance', 'create') },
);
