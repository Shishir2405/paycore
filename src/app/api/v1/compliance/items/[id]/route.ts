import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { complianceService } from '@/server/services/compliance.service';
import { complianceItemUpdateSchema } from '@/lib/validators/compliance';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const item = await complianceService.getItem(auth, params.id);
    return ok(item);
  },
  { permission: permission('compliance', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = complianceItemUpdateSchema.parse(await req.json());
    const item = await complianceService.updateItem(auth, params.id, body, requestMeta(req));
    return ok(item);
  },
  { permission: permission('compliance', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await complianceService.removeItem(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('compliance', 'edit') },
);
