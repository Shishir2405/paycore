/**
 * Route-handler wrapper — the composition point for every /api/v1 endpoint.
 * Handles: DB connect, auth resolution, RBAC permission check, param unwrapping,
 * and uniform error → response mapping. Keeps individual handlers tiny.
 */
import type { NextRequest } from 'next/server';
import { dbConnect } from '@/lib/db/connect';
import { requireAuth } from '@/lib/auth/session';
import { hasPermission } from '@/lib/rbac/permissions';
import { AppError } from '@/lib/utils/errors';
import { toErrorResponse } from '@/lib/utils/api-response';
import type { AuthContext } from '@/types';

export type RouteCtx<P> = { req: NextRequest; auth: AuthContext; params: P };
export type PublicRouteCtx<P> = { req: NextRequest; params: P };

/**
 * Next 15 passes a context whose `params` is a Promise. The shape must match the
 * generated RouteContext exactly (no `| undefined`), or `next build` fails type
 * validation — hence the precise `RouteSegment` type below.
 */
type RouteSegment<P> = { params: Promise<P> };

async function resolveParams<P>(segment: RouteSegment<P>): Promise<P> {
  return ((await segment?.params) ?? {}) as P;
}

/** Authenticated route. Optionally gated by a `module:action` permission. */
export function withRoute<P = Record<string, string>>(
  handler: (ctx: RouteCtx<P>) => Promise<Response> | Response,
  options?: { permission?: string },
) {
  return async (req: NextRequest, segment: RouteSegment<P>): Promise<Response> => {
    try {
      await dbConnect();
      const auth = await requireAuth();
      if (options?.permission && !hasPermission(auth, options.permission)) {
        throw AppError.forbidden();
      }
      const params = await resolveParams<P>(segment);
      return await handler({ req, auth, params });
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/** Public route (login, refresh, health) — no auth required. */
export function withPublicRoute<P = Record<string, string>>(
  handler: (ctx: PublicRouteCtx<P>) => Promise<Response> | Response,
) {
  return async (req: NextRequest, segment: RouteSegment<P>): Promise<Response> => {
    try {
      await dbConnect();
      const params = await resolveParams<P>(segment);
      return await handler({ req, params });
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
