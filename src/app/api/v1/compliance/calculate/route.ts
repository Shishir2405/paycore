import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { permission } from '@/lib/rbac/permissions';
import { complianceService } from '@/server/services/compliance.service';
import { calculateSchema } from '@/lib/validators/compliance';

export const runtime = 'nodejs';

export const POST = withRoute(
  async ({ req, auth }) => {
    const body = calculateSchema.parse(await req.json());
    const result = await complianceService.calculate(auth, body);
    return ok(result);
  },
  { permission: permission('compliance', 'view') },
);
