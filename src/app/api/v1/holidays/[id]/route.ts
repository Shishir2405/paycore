import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { holidayService } from '@/server/services/holiday.service';
import { holidayUpdateSchema } from '@/lib/validators/holiday';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const holiday = await holidayService.get(auth, params.id);
    return ok(holiday);
  },
  { permission: permission('attendance', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = holidayUpdateSchema.parse(await req.json());
    const holiday = await holidayService.update(auth, params.id, body, requestMeta(req));
    return ok(holiday);
  },
  { permission: permission('attendance', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await holidayService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('attendance', 'delete') },
);
