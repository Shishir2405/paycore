import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { leaveTypeService } from '@/server/services/leave-type.service';
import { leaveTypeUpdateSchema } from '@/lib/validators/leave';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const leaveType = await leaveTypeService.get(auth, params.id);
    return ok(leaveType);
  },
  { permission: permission('leave', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = leaveTypeUpdateSchema.parse(await req.json());
    const leaveType = await leaveTypeService.update(auth, params.id, body, requestMeta(req));
    return ok(leaveType);
  },
  { permission: permission('leave', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await leaveTypeService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('leave', 'delete') },
);
