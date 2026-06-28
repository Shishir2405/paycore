import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { requestMeta } from '@/lib/audit/log';
import { permission } from '@/lib/rbac/permissions';
import { reimbursementService } from '@/server/services/reimbursement.service';
import { reimbursementDecisionSchema } from '@/lib/validators/benefits';

export const runtime = 'nodejs';

type Params = { id: string };

export const POST = withRoute<Params>(
  async ({ req, auth, params }) => {
    const body = reimbursementDecisionSchema.parse(await req.json().catch(() => ({})));
    const claim = await reimbursementService.approve(auth, params.id, body.note, requestMeta(req));
    return ok(claim);
  },
  { permission: permission('benefits', 'approve') },
);
