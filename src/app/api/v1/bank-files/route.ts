import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { bankFileService } from '@/server/services/bank-file.service';
import { bankFileCreateSchema } from '@/lib/validators/finance';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'generatedAt' });
    const filter = {
      format: sp.get('format') ?? undefined,
      payrollRunId: sp.get('payrollRunId') ?? undefined,
    };
    const { data, meta } = await bankFileService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('finance', 'view') },
);

/**
 * Generate a bank disbursement file from beneficiary rows. Persists a record
 * (with control totals) and returns it alongside the generated text content so
 * the client can offer an immediate download.
 */
export const POST = withRoute(
  async ({ req, auth }) => {
    const body = bankFileCreateSchema.parse(await req.json());
    const { record, content } = await bankFileService.generate(auth, body, requestMeta(req));
    return created({ ...record, content });
  },
  { permission: permission('finance', 'create') },
);
