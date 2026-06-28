import { withRoute } from '@/server/middlewares/with-route';
import { permission } from '@/lib/rbac/permissions';
import { csvTemplate } from '@/lib/utils/tabular';
import { IMPORT_HEADERS } from '@/server/services/employee.service';

export const runtime = 'nodejs';

/** Downloadable headers-only template that the import endpoint accepts. */
export const GET = withRoute(
  async () =>
    new Response(csvTemplate(IMPORT_HEADERS), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="employee-import-template.csv"',
      },
    }),
  { permission: permission('employees', 'import') },
);
