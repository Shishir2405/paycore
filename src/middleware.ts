/**
 * Edge middleware — page-level route protection. Verifies JWT signatures only
 * (no DB); full permission + token-version checks happen in route handlers.
 *
 * A page loads if the access token is valid, OR a refresh token is present and
 * valid (the client will silently refresh on its next API call). Otherwise we
 * bounce to /login, preserving the intended path in `?next=`.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth/jwt';

const accessKey = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET ?? '');
const refreshKey = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET ?? '');

async function valid(token: string | undefined, key: Uint8Array): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, key);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const hasAccess = await valid(req.cookies.get(ACCESS_COOKIE)?.value, accessKey);
  const hasRefresh = await valid(req.cookies.get(REFRESH_COOKIE)?.value, refreshKey);
  const authed = hasAccess || hasRefresh;

  if (pathname === '/') {
    return NextResponse.redirect(new URL(authed ? '/dashboard' : '/login', req.url));
  }

  if (!authed) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protect everything except API routes, static assets, and the login page.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|.*\\..*).*)'],
};
