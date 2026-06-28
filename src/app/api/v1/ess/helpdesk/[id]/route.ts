import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { permission } from '@/lib/rbac/permissions';
import { essService } from '@/server/services/ess.service';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const ticket = await essService.getTicket(auth, params.id);
    return ok(ticket);
  },
  { permission: permission('ess', 'view') },
);
