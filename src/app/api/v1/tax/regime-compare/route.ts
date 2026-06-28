import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { permission } from '@/lib/rbac/permissions';
import { taxService } from '@/server/services/tax.service';
import { regimeCompareSchema } from '@/lib/validators/tax';

export const runtime = 'nodejs';

export const POST = withRoute(
  async ({ req, auth }) => {
    // auth (and the tax:view gate) are enforced by withRoute before we get here.
    void auth;
    const body = regimeCompareSchema.parse(await req.json());
    const result = taxService.compareRegimes(body);
    return ok(result);
  },
  { permission: permission('tax', 'view') },
);
