import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { permission } from '@/lib/rbac/permissions';
import { loanService } from '@/server/services/loan.service';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const schedule = await loanService.schedule(auth, params.id);
    return ok(schedule);
  },
  { permission: permission('benefits', 'view') },
);
