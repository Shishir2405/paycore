import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { permission } from '@/lib/rbac/permissions';
import { essService } from '@/server/services/ess.service';

export const runtime = 'nodejs';

export const GET = withRoute(
  async ({ auth }) => {
    const summary = await essService.summary(auth);
    return ok(summary);
  },
  { permission: permission('ess', 'view') },
);
