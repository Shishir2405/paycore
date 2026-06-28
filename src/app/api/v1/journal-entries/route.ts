import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { journalEntryService } from '@/server/services/journal-entry.service';
import { journalEntryCreateSchema } from '@/lib/validators/finance';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'date' });
    const filter = {
      source: sp.get('source') ?? undefined,
      payrollRunId: sp.get('payrollRunId') ?? undefined,
    };
    const { data, meta } = await journalEntryService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('finance', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = journalEntryCreateSchema.parse(await req.json());
    const entry = await journalEntryService.create(auth, body, requestMeta(req));
    return created(entry);
  },
  { permission: permission('finance', 'create') },
);
