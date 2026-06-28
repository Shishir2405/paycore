import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { complianceService } from '@/server/services/compliance.service';
import { lwfRuleUpdateSchema } from '@/lib/validators/compliance';

export const runtime = 'nodejs';

type Params = { id: string };

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = lwfRuleUpdateSchema.parse(await req.json());
    const rule = await complianceService.updateLwfRule(auth, params.id, body, requestMeta(req));
    return ok(rule);
  },
  { permission: permission('compliance', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await complianceService.removeLwfRule(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('compliance', 'edit') },
);
