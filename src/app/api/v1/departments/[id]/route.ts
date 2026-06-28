import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { departmentService } from '@/server/services/department.service';
import { departmentUpdateSchema } from '@/lib/validators/department';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const department = await departmentService.get(auth, params.id);
    return ok(department);
  },
  { permission: permission('departments', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = departmentUpdateSchema.parse(await req.json());
    const department = await departmentService.update(auth, params.id, body, requestMeta(req));
    return ok(department);
  },
  { permission: permission('departments', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await departmentService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('departments', 'delete') },
);
