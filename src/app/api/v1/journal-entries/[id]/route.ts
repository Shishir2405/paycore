import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { journalEntryService } from '@/server/services/journal-entry.service';
import { journalEntryUpdateSchema } from '@/lib/validators/finance';

export const runtime = 'nodejs';

type Params = { id: string };

export const GET = withRoute<Params>(
  async ({ auth, params }) => {
    const entry = await journalEntryService.get(auth, params.id);
    return ok(entry);
  },
  { permission: permission('finance', 'view') },
);

// `finance` exposes view/create/export only — mutations gate on the create grant.
export const PUT = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = journalEntryUpdateSchema.parse(await req.json());
    const entry = await journalEntryService.update(auth, params.id, body, requestMeta(req));
    return ok(entry);
  },
  { permission: permission('finance', 'create') },
);

export const DELETE = withRoute<Params>(
  async ({ req, auth, params }) => {
    const result = await journalEntryService.remove(auth, params.id, requestMeta(req));
    return ok(result);
  },
  { permission: permission('finance', 'create') },
);
