import { withPublicRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { getAuthContext } from '@/lib/auth/session';
import { authService } from '@/server/services/auth.service';

export const runtime = 'nodejs';

export const POST = withPublicRoute(async ({ req }) => {
  const ctx = await getAuthContext();
  await authService.logout(ctx, req);
  return ok({ success: true });
});
