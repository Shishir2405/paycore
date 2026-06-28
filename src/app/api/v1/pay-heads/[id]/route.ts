import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { payHeadService } from '@/server/services/pay-head.service';
import { payHeadUpdateSchema } from '@/lib/validators/pay-head';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const payHead = await payHeadService.get(auth, params.id);
    return ok(payHead);
  },
  { permission: permission('payheads', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = payHeadUpdateSchema.parse(await req.json());
    const payHead = await payHeadService.update(auth, params.id, body, requestMeta(req));
    return ok(payHead);
  },
  { permission: permission('payheads', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await payHeadService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('payheads', 'delete') },
);
