/**
 * Authentication business logic. Controllers (route handlers) stay thin and
 * delegate here. This layer knows nothing about HTTP — only domain operations.
 */
import { User } from '@/models/User';
import { Role } from '@/models/Role';
import { verifyPassword } from '@/lib/auth/password';
import { issueSession, clearSession } from '@/lib/auth/session';
import { verifyRefreshToken, REFRESH_COOKIE } from '@/lib/auth/jwt';
import { recordAudit, requestMeta } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import type { LoginInput } from '@/lib/validators/auth';
import type { AuthContext } from '@/types';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  permissions: string[];
};

async function buildSessionUser(userId: string): Promise<SessionUser> {
  const user = await User.findOne({ _id: userId, isDeleted: false }).lean().exec();
  if (!user) throw AppError.unauthorized();
  const role = await Role.findById(user.roleId).lean().exec();
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.roleName,
    companyId: String(user.companyId),
    permissions: role?.permissions ?? [],
  };
}

export const authService = {
  /**
   * Email is unique per tenant; at login we don't yet know the tenant, so we
   * match by email across companies. A real multi-tenant deployment would scope
   * this by subdomain/company code — left as a single lookup for now.
   */
  async login(input: LoginInput, req: Request): Promise<SessionUser> {
    const user = await User.findOne({ email: input.email.toLowerCase(), isDeleted: false })
      .select('+passwordHash')
      .exec();

    // Same generic error whether the user is missing or the password is wrong.
    if (!user || !user.isActive) throw AppError.unauthorized('Invalid email or password');

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) throw AppError.unauthorized('Invalid email or password');

    user.lastLoginAt = new Date();
    await user.save();

    await issueSession({
      userId: String(user._id),
      companyId: String(user.companyId),
      email: user.email,
      name: user.name,
      role: user.roleName,
      tokenVersion: user.tokenVersion,
    });

    const sessionUser = await buildSessionUser(String(user._id));

    await recordAudit(
      { ...sessionUser, userId: sessionUser.id } as AuthContext,
      { action: 'login', module: 'auth', summary: `${user.email} signed in`, meta: requestMeta(req) },
    );

    return sessionUser;
  },

  /** Rotate the session from a valid refresh token (token-version checked). */
  async refresh(req: Request): Promise<SessionUser> {
    const cookie = req.headers.get('cookie') ?? '';
    const token = cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${REFRESH_COOKIE}=`))
      ?.split('=')[1];

    if (!token) throw AppError.unauthorized('No refresh token');

    let claims;
    try {
      claims = await verifyRefreshToken(decodeURIComponent(token));
    } catch {
      throw AppError.unauthorized('Refresh token expired');
    }

    const user = await User.findOne({ _id: claims.sub, isDeleted: false, isActive: true }).exec();
    if (!user || user.tokenVersion !== claims.tokenVersion) {
      throw AppError.unauthorized('Session revoked');
    }

    await issueSession({
      userId: String(user._id),
      companyId: String(user.companyId),
      email: user.email,
      name: user.name,
      role: user.roleName,
      tokenVersion: user.tokenVersion,
    });

    return buildSessionUser(String(user._id));
  },

  /** Logout: clear cookies and bump tokenVersion to revoke outstanding refreshes. */
  async logout(ctx: AuthContext | null, req: Request): Promise<void> {
    if (ctx) {
      await User.updateOne({ _id: ctx.userId }, { $inc: { tokenVersion: 1 } }).exec();
      await recordAudit(ctx, {
        action: 'logout',
        module: 'auth',
        summary: `${ctx.email} signed out`,
        meta: requestMeta(req),
      });
    }
    await clearSession();
  },

  me: buildSessionUser,
};
