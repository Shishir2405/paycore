import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { bonusService } from '@/server/services/bonus.service';
import { bonusUpdateSchema } from '@/lib/validators/payroll';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const bonus = await bonusService.get(auth, params.id);
    return ok(bonus);
  },
  { permission: permission('payroll', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = bonusUpdateSchema.parse(await req.json());
    const bonus = await bonusService.update(auth, params.id, body, requestMeta(req));
    return ok(bonus);
  },
  { permission: permission('payroll', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await bonusService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('payroll', 'edit') },
);
