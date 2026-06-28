import { withPublicRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { loginSchema } from '@/lib/validators/auth';
import { authService } from '@/server/services/auth.service';

export const runtime = 'nodejs';

export const POST = withPublicRoute(async ({ req }) => {
  const body = loginSchema.parse(await req.json());
  const user = await authService.login(body, req);
  return ok(user);
});
