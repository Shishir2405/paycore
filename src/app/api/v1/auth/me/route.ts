import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { authService } from '@/server/services/auth.service';

export const runtime = 'nodejs';

export const GET = withRoute(async ({ auth }) => {
  const user = await authService.me(auth.userId);
  return ok(user);
});
