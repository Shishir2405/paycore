/**
 * Server-side session helpers. `getAuthContext` is the single entry point route
 * handlers use to resolve the current user + live permissions from the DB.
 */
import { cookies } from 'next/headers';
import { dbConnect } from '@/lib/db/connect';
import { User } from '@/models/User';
import { Role } from '@/models/Role';
import { AppError } from '@/lib/utils/errors';
import type { AuthContext } from '@/types';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
} from './jwt';
import { env } from '@/config/env';

const isProd = env.NODE_ENV === 'production';

type IssueInput = {
  userId: string;
  companyId: string;
  email: string;
  name: string;
  role: string;
  tokenVersion: number;
};

/** Mint both tokens and write them as httpOnly cookies. */
export async function issueSession(input: IssueInput): Promise<void> {
  const [access, refresh] = await Promise.all([
    signAccessToken({
      sub: input.userId,
      companyId: input.companyId,
      email: input.email,
      name: input.name,
      role: input.role,
    }),
    signRefreshToken({
      sub: input.userId,
      companyId: input.companyId,
      tokenVersion: input.tokenVersion,
    }),
  ]);

  const jar = await cookies();
  const common = { httpOnly: true, secure: isProd, sameSite: 'lax' as const, path: '/' };
  jar.set(ACCESS_COOKIE, access, { ...common, maxAge: env.JWT_ACCESS_TTL });
  jar.set(REFRESH_COOKIE, refresh, { ...common, maxAge: env.JWT_REFRESH_TTL });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

/**
 * Resolve the authenticated context, or null if unauthenticated.
 * Loads the user and role fresh so permission/role changes take effect at once.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  let claims;
  try {
    claims = await verifyAccessToken(token);
  } catch {
    return null;
  }

  await dbConnect();
  const user = await User.findOne({
    _id: claims.sub,
    companyId: claims.companyId,
    isDeleted: false,
    isActive: true,
  })
    .lean()
    .exec();
  if (!user) return null;

  const role = await Role.findOne({ _id: user.roleId, companyId: user.companyId, isDeleted: false })
    .lean()
    .exec();

  return {
    userId: String(user._id),
    companyId: String(user.companyId),
    email: user.email,
    name: user.name,
    role: user.roleName,
    permissions: role?.permissions ?? [],
  };
}

/** Same as getAuthContext but throws 401 — convenient for guarded handlers. */
export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw AppError.unauthorized();
  return ctx;
}
