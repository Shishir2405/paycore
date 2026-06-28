import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { shiftService } from '@/server/services/shift.service';
import { shiftUpdateSchema } from '@/lib/validators/shift';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const shift = await shiftService.get(auth, params.id);
    return ok(shift);
  },
  { permission: permission('attendance', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = shiftUpdateSchema.parse(await req.json());
    const shift = await shiftService.update(auth, params.id, body, requestMeta(req));
    return ok(shift);
  },
  { permission: permission('attendance', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await shiftService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('attendance', 'delete') },
);
