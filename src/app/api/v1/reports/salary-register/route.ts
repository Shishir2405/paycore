import { withRoute } from '@/server/middlewares/with-route';
import { AppError } from '@/lib/utils/errors';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { payslipService } from '@/server/services/payslip.service';
import { toDownloadResponse } from '@/lib/export/response';
import type { ExportFormat } from '@/lib/export/exporter';

export const runtime = 'nodejs';

const FORMATS: ExportFormat[] = ['csv', 'xlsx', 'pdf', 'json'];

/** GET /reports/salary-register?runId=&format=csv|xlsx|pdf|json */
export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const runId = sp.get('runId');
    if (!runId) throw AppError.badRequest('runId is required');
    const format = (sp.get('format') ?? 'csv') as ExportFormat;
    if (!FORMATS.includes(format)) throw AppError.badRequest('Invalid format');

    const result = await payslipService.report(auth, 'salary-register', runId, format);
    void requestMeta(req);
    return toDownloadResponse(result, result.filename);
  },
  { permission: permission('payslips', 'export') },
);
