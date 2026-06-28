import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { leaveRequestService } from '@/server/services/leave-request.service';
import { leaveRequestUpdateSchema } from '@/lib/validators/leave';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const request = await leaveRequestService.get(auth, params.id);
    return ok(request);
  },
  { permission: permission('leave', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = leaveRequestUpdateSchema.parse(await req.json());
    const request = await leaveRequestService.update(auth, params.id, body, requestMeta(req));
    return ok(request);
  },
  { permission: permission('leave', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await leaveRequestService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('leave', 'delete') },
);
