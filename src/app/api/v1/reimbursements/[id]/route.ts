import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { reimbursementService } from '@/server/services/reimbursement.service';
import { reimbursementUpdateSchema } from '@/lib/validators/benefits';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const claim = await reimbursementService.get(auth, params.id);
    return ok(claim);
  },
  { permission: permission('benefits', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = reimbursementUpdateSchema.parse(await req.json());
    const claim = await reimbursementService.update(auth, params.id, body, requestMeta(req));
    return ok(claim);
  },
  { permission: permission('benefits', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await reimbursementService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('benefits', 'delete') },
);
