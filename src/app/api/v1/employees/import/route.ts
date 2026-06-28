import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { AppError } from '@/lib/utils/errors';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { employeeService } from '@/server/services/employee.service';

export const runtime = 'nodejs';

export const POST = withRoute(
  async ({ req, auth }) => {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw AppError.badRequest('A file is required under the "file" field');
    const report = await employeeService.import(auth, file, requestMeta(req));
    return ok(report);
  },
  { permission: permission('employees', 'import') },
);
