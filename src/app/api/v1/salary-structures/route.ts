import { withRoute } from '@/server/middlewares/with-route';
import { created, paginated } from '@/lib/utils/api-response';
import { parseListQuery } from '@/lib/utils/pagination';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { salaryStructureService } from '@/server/services/salary-structure.service';
import { salaryStructureCreateSchema } from '@/lib/validators/payroll';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ req, auth }) => {
    const sp = req.nextUrl.searchParams;
    const query = parseListQuery(sp, { sortBy: 'createdAt' });
    const filter = {
      employeeId: sp.get('employeeId') ?? undefined,
      isActive: sp.get('isActive') ?? undefined,
    };
    const { data, meta } = await salaryStructureService.list(auth, query, filter);
    return paginated(data, meta);
  },
  { permission: permission('payroll', 'view') },
);

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = salaryStructureCreateSchema.parse(await req.json());
    const structure = await salaryStructureService.create(auth, body, requestMeta(req));
    return created(structure);
  },
  { permission: permission('payroll', 'create') },
);
