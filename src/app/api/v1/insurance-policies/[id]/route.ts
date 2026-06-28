import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { insurancePolicyService } from '@/server/services/insurance-policy.service';
import { insurancePolicyUpdateSchema } from '@/lib/validators/benefits';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const policy = await insurancePolicyService.get(auth, params.id);
    return ok(policy);
  },
  { permission: permission('benefits', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = insurancePolicyUpdateSchema.parse(await req.json());
    const policy = await insurancePolicyService.update(auth, params.id, body, requestMeta(req));
    return ok(policy);
  },
  { permission: permission('benefits', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await insurancePolicyService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('benefits', 'delete') },
);
