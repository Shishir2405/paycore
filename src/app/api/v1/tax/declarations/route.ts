import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { taxService } from '@/server/services/tax.service';
import { taxDeclarationCreateSchema } from '@/lib/validators/tax';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'createdAt' });
    const filter = {
      financialYear: sp.get('financialYear') ?? undefined,
      status: sp.get('status') ?? undefined,
      regime: sp.get('regime') ?? undefined,
      employeeId: sp.get('employeeId') ?? undefined,
    };
    const { data, meta } = await taxService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('tax', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = taxDeclarationCreateSchema.parse(await req.json());
    const declaration = await taxService.create(auth, body, requestMeta(req));
    return created(declaration);
  },
  { permission: permission('tax', 'create') },
);
