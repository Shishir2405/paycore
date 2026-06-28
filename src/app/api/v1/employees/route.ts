import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { employeeService } from '@/server/services/employee.service';
import { employeeCreateSchema } from '@/lib/validators/employee';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'employeeCode' });
    const filter = {
      status: sp.get('status') ?? undefined,
      departmentId: sp.get('departmentId') ?? undefined,
      designationId: sp.get('designationId') ?? undefined,
    };
    const { data, meta } = await employeeService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('employees', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = employeeCreateSchema.parse(await req.json());
    const employee = await employeeService.create(auth, body, requestMeta(req));
    return created(employee);
  },
  { permission: permission('employees', 'create') },
);
