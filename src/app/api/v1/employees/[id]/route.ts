import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { employeeService } from '@/server/services/employee.service';
import { employeeUpdateSchema } from '@/lib/validators/employee';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ req, auth, params }) => {
    // `?reveal=1` returns unmasked PII — gated by the edit permission.
    const reveal = req.nextUrl.searchParams.get('reveal') === '1';
    const employee = await employeeService.get(auth, params.id, reveal);
    return ok(employee);
  },
  { permission: permission('employees', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = employeeUpdateSchema.parse(await req.json());
    const employee = await employeeService.update(auth, params.id, body, requestMeta(req));
    return ok(employee);
  },
  { permission: permission('employees', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await employeeService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('employees', 'delete') },
);
