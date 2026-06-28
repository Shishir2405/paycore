import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { leaveRequestService } from '@/server/services/leave-request.service';
import { leaveDecisionSchema } from '@/lib/validators/leave';

export const runtime = 'nodejs';

type Params = { id: string };

export const POST = withRoute<Params>(
  async ({ req, auth, params }) => {
    const raw = await req.json().catch(() => ({}));
    const body = leaveDecisionSchema.parse(raw ?? {});
    const request = await leaveRequestService.reject(auth, params.id, body, requestMeta(req));
    return ok(request);
  },
  { permission: permission('leave', 'approve') },
);
