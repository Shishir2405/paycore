import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { arrearService } from '@/server/services/arrear.service';
import { arrearUpdateSchema } from '@/lib/validators/payroll';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const arrear = await arrearService.get(auth, params.id);
    return ok(arrear);
  },
  { permission: permission('payroll', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = arrearUpdateSchema.parse(await req.json());
    const arrear = await arrearService.update(auth, params.id, body, requestMeta(req));
    return ok(arrear);
  },
  { permission: permission('payroll', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await arrearService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('payroll', 'edit') },
);
