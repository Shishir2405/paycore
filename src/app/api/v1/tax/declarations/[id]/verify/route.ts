import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { taxService } from '@/server/services/tax.service';
import { taxDeclarationVerifySchema } from '@/lib/validators/tax';

export const runtime = 'nodejs';

type Params = { id: string };

export const POST = withRoute<Params>(
  async ({ req, auth, params }) => {
    const raw = await req.json().catch(() => ({}));
    const body = taxDeclarationVerifySchema.parse(raw ?? {});
    const declaration = await taxService.verify(auth, params.id, body, requestMeta(req));
    return ok(declaration);
  },
  { permission: permission('tax', 'approve') },
);
