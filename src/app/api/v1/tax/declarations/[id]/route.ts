import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { taxService } from '@/server/services/tax.service';
import { taxDeclarationUpdateSchema } from '@/lib/validators/tax';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const declaration = await taxService.get(auth, params.id);
    return ok(declaration);
  },
  { permission: permission('tax', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = taxDeclarationUpdateSchema.parse(await req.json());
    const declaration = await taxService.update(auth, params.id, body, requestMeta(req));
    return ok(declaration);
  },
  { permission: permission('tax', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await taxService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('tax', 'edit') },
);
