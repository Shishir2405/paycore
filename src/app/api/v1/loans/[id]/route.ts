import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { loanService } from '@/server/services/loan.service';
import { loanUpdateSchema } from '@/lib/validators/benefits';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const loan = await loanService.get(auth, params.id);
    return ok(loan);
  },
  { permission: permission('benefits', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = loanUpdateSchema.parse(await req.json());
    const loan = await loanService.update(auth, params.id, body, requestMeta(req));
    return ok(loan);
  },
  { permission: permission('benefits', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await loanService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('benefits', 'delete') },
);
