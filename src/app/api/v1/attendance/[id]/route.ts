import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { attendanceService } from '@/server/services/attendance.service';
import { attendanceUpdateSchema } from '@/lib/validators/attendance';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const record = await attendanceService.get(auth, params.id);
    return ok(record);
  },
  { permission: permission('attendance', 'view') },
);

export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = attendanceUpdateSchema.parse(await req.json());
    const record = await attendanceService.update(auth, params.id, body, requestMeta(req));
    return ok(record);
  },
  { permission: permission('attendance', 'edit') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await attendanceService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('attendance', 'delete') },
);
