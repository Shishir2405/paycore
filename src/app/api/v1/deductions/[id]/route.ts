import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { deductionService } from '@/server/services/deduction.service';
import { deductionUpdateSchema } from '@/lib/validators/benefits';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const deduction = await deductionService.get(auth, params.id);
    return ok(deduction);
  },
  { permission: permission('benefits', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = deductionUpdateSchema.parse(await req.json());
    const deduction = await deductionService.update(auth, params.id, body, requestMeta(req));
    return ok(deduction);
  },
  { permission: permission('benefits', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await deductionService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('benefits', 'delete') },
);
