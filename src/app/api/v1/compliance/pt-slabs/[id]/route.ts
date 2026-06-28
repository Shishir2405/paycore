import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { complianceService } from '@/server/services/compliance.service';
import { ptSlabUpdateSchema } from '@/lib/validators/compliance';

export const runtime = 'nodejs';

type Params = { id: string };

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = ptSlabUpdateSchema.parse(await req.json());
    const slab = await complianceService.updatePtSlab(auth, params.id, body, requestMeta(req));
    return ok(slab);
  },
  { permission: permission('compliance', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await complianceService.removePtSlab(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('compliance', 'edit') },
);
