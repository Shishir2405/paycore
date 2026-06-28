import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { payrollService } from '@/server/services/payroll.service';
import { payrollRunDecisionSchema } from '@/lib/validators/payroll';

export const runtime = 'nodejs';

type Params = { id: string };

export const POST = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = payrollRunDecisionSchema.parse(await req.json().catch(() => ({})));
    const run = await payrollService.lock(auth, params.id, body.notes, requestMeta(req));
    return ok(run);
  },
  { permission: permission('payroll', 'approve') },
);
