import { withPublicRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { authService } from '@/server/services/auth.service';

export const runtime = 'nodejs';

export const POST = withPublicRoute(async ({ req }) => {
  const user = await authService.refresh(req);
  return ok(user);
});
