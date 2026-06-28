import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { essService } from '@/server/services/ess.service';
import { helpdeskRespondSchema } from '@/lib/validators/ess';

export const runtime = 'nodejs';

type Params = { id: string };

export const POST = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = helpdeskRespondSchema.parse(await req.json());
    const ticket = await essService.respondTicket(auth, params.id, body, requestMeta(req));
    return ok(ticket);
  },
  { permission: permission('ess', 'edit') },
);
