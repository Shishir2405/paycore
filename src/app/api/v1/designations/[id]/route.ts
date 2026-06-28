import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { designationService } from '@/server/services/designation.service';
import { designationUpdateSchema } from '@/lib/validators/designation';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const designation = await designationService.get(auth, params.id);
    return ok(designation);
  },
  { permission: permission('departments', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = designationUpdateSchema.parse(await req.json());
    const designation = await designationService.update(auth, params.id, body, requestMeta(req));
    return ok(designation);
  },
  { permission: permission('departments', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await designationService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('departments', 'delete') },
);
