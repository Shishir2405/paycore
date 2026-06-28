import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { salaryStructureService } from '@/server/services/salary-structure.service';
import { salaryStructureUpdateSchema } from '@/lib/validators/payroll';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const structure = await salaryStructureService.get(auth, params.id);
    return ok(structure);
  },
  { permission: permission('payroll', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = salaryStructureUpdateSchema.parse(await req.json());
    const structure = await salaryStructureService.update(auth, params.id, body, requestMeta(req));
    return ok(structure);
  },
  { permission: permission('payroll', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await salaryStructureService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('payroll', 'edit') },
);
