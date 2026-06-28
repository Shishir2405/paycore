import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { designationService } from '@/server/services/designation.service';
import { designationCreateSchema } from '@/lib/validators/designation';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'level' });
    const isActive = sp.get('isActive');
    const filter = {
      isActive: isActive === null ? undefined : isActive === 'true',
      grade: sp.get('grade') ?? undefined,
    };
    const { data, meta } = await designationService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('departments', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = designationCreateSchema.parse(await req.json());
    const designation = await designationService.create(auth, body, requestMeta(req));
    return created(designation);
  },
  { permission: permission('departments', 'create') },
);
