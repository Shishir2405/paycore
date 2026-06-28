import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { departmentService } from '@/server/services/department.service';
import { departmentCreateSchema } from '@/lib/validators/department';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'code' });
    const isActive = sp.get('isActive');
    const filter = {
      isActive: isActive === null ? undefined : isActive === 'true',
      parentId: sp.get('parentId') ?? undefined,
    };
    const { data, meta } = await departmentService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('departments', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = departmentCreateSchema.parse(await req.json());
    const department = await departmentService.create(auth, body, requestMeta(req));
    return created(department);
  },
  { permission: permission('departments', 'create') },
);
