/**
 * JWT signing/verification using `jose` so the same code runs in both the Node
 * runtime (route handlers) and the Edge runtime (Next middleware).
 *
 * Two token types:
 *   - access  (short-lived, sent on every request, identifies the user)
 *   - refresh (long-lived, rotates; carries `tokenVersion` for revocation)
 */
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { env } from '@/config/env';

export const ACCESS_COOKIE = 'pc_access';
export const REFRESH_COOKIE = 'pc_refresh';

export type AccessClaims = JWTPayload & {
  sub: string;
  companyId: string;
  email: string;
  name: string;
  role: string;
};

export type RefreshClaims = JWTPayload & {
  sub: string;
  companyId: string;
  tokenVersion: number;
};

const accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshKey = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

// Explicit input shapes — JWTPayload's index signature makes `Omit` collapse,
// so we describe exactly what each token carries.
export type AccessTokenInput = { sub: string; companyId: string; email: string; name: string; role: string };
export type RefreshTokenInput = { sub: string; companyId: string; tokenVersion: number };

export async function signAccessToken({ sub, ...claims }: AccessTokenInput) {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_ACCESS_TTL}s`)
    .sign(accessKey);
}

export async function signRefreshToken({ sub, ...claims }: RefreshTokenInput) {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_REFRESH_TTL}s`)
    .sign(refreshKey);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, accessKey);
  return payload as AccessClaims;
}

export async function verifyRefreshToken(token: string): Promise<RefreshClaims> {
  const { payload } = await jwtVerify(token, refreshKey);
  return payload as RefreshClaims;
}
