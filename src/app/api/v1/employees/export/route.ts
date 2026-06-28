import { withRoute } from '@/server/middlewares/with-route';
import { parseListQuery } from '@/lib/utils/pagination';
import { permission } from '@/lib/rbac/permissions';
import { employeeService } from '@/server/services/employee.service';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const format = sp.get('format') === 'xlsx' ? 'xlsx' : 'csv';
    const query = parseListQuery(sp, { sortBy: 'employeeCode' });
    const filter = {
      status: sp.get('status') ?? undefined,
      departmentId: sp.get('departmentId') ?? undefined,
      designationId: sp.get('designationId') ?? undefined,
    };

    const result = await employeeService.export(auth, query, filter, format);
    const stamp = new Date().toISOString().slice(0, 10);

    if (result.kind === 'xlsx') {
      return new Response(new Uint8Array(result.buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="employees-${stamp}.xlsx"`,
        },
      });
    }
    return new Response(result.content, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="employees-${stamp}.csv"`,
      },
    });
  },
  { permission: permission('employees', 'export') },
);
