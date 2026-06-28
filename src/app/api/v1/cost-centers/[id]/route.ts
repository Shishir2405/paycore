import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { costCenterService } from '@/server/services/cost-center.service';
import { costCenterUpdateSchema } from '@/lib/validators/finance';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const costCenter = await costCenterService.get(auth, params.id);
    return ok(costCenter);
  },
  { permission: permission('finance', 'view') },
);

// `finance` exposes view/create/export only — mutations gate on the create grant.
export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = costCenterUpdateSchema.parse(await req.json());
    const costCenter = await costCenterService.update(auth, params.id, body, requestMeta(req));
    return ok(costCenter);
  },
  { permission: permission('finance', 'create') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await costCenterService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('finance', 'create') },
);
