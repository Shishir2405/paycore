import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { AppError } from '@/lib/utils/errors';
import { permission } from '@/lib/rbac/permissions';
import { payslipService } from '@/server/services/payslip.service';

export const runtime = 'nodejs';

/** GET /payslips?runId= — payslip rows (entries) for a payroll run. */
export const GET = withRoute(
  async ({ req, auth }) => {
    const runId = req.nextUrl.searchParams.get('runId');
    if (!runId) throw AppError.badRequest('runId is required');
    const rows = await payslipService.list(auth, runId);
    return ok(rows);
  },
  { permission: permission('payslips', 'view') },
);
