import { withRoute } from '@/server/middlewares/with-route';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { payslipService } from '@/server/services/payslip.service';

export const runtime = 'nodejs';

type Params = { id: string };

/** GET /payslips/:id/pdf — download a single employee's payslip as a PDF. */
export const GET = withRoute<Params>(
  async ({ auth, params, req }) => {
    void requestMeta(req);
    const { bytes, filename } = await payslipService.generateOne(auth, params.id);
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  },
  { permission: permission('payslips', 'view') },
);
