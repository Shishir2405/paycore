import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { permission } from '@/lib/rbac/permissions';
import { payrollService } from '@/server/services/payroll.service';

export const runtime = 'nodejs';

type Params = { id: string };

/** Run detail including its per-employee entries. */
export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const detail = await payrollService.getRun(auth, params.id);
    return ok(detail);
  },
  { permission: permission('payroll', 'view') },
);
