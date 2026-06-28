import { withRoute } from '@/server/middlewares/with-route';
import { parseListQuery } from '@/lib/utils/pagination';
import { permission } from '@/lib/rbac/permissions';
import { journalEntryService } from '@/server/services/journal-entry.service';

export const runtime = 'nodejs';

/**
 * Export the filtered journal set. `?format=tally` (the default and only format
 * for now) returns a Tally-import-compatible XML document as a file download.
 */
export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'date' });
    const filter = {
      source: sp.get('source') ?? undefined,
      payrollRunId: sp.get('payrollRunId') ?? undefined,
    };

    const xml = await journalEntryService.exportTally(auth, query, filter);
    const stamp = new Date().toISOString().slice(0, 10);

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="tally-vouchers-${stamp}.xml"`,
      },
    });
  },
  { permission: permission('finance', 'export') },
);
