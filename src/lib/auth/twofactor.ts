/**
 * TOTP two-factor authentication helpers (otplib).
 *
 * Flow: `generateSecret()` mints a base32 secret stored (encrypted) against the
 * user; `otpauthUrl()` builds the `otpauth://` URI for the QR code shown during
 * enrollment; `verifyToken()` checks the 6-digit code from the authenticator app
 * with a small time window to tolerate clock drift.
 */
import { generateSecret as otplibSecret, generateURI, verify } from 'otplib';
import { env } from '@/config/env';

const ISSUER = env.APP_NAME;

/** Mint a fresh base32 secret to associate with a user during 2FA setup. */
export function generateSecret(): string {
  return otplibSecret();
}

/** Build the otpauth:// URI an authenticator app scans (encode in a QR client-side). */
export function otpauthUrl(secret: string, accountLabel: string): string {
  return generateURI({ issuer: ISSUER, label: accountLabel, secret });
}

/**
 * Verify a user-entered token against the secret. Allows ±1 time-step (30s) of
 * drift so a code entered right at a boundary still passes.
 */
export async function verifyToken(secret: string, token: string): Promise<boolean> {
  if (!secret || !token) return false;
  try {
    const result = await verify({ secret, token: token.trim(), epochTolerance: 30 });
    return result.valid;
  } catch {
    return false;
  }
}
