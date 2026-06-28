/**
 * Field-level encryption for sensitive PII (PAN, Aadhaar, bank account number).
 *
 * AES-256-GCM. Ciphertext is stored as `v1:<iv>:<tag>:<data>` (all base64) so the
 * scheme is self-describing and rotatable later. Use `maskSensitive` for display.
 */
import crypto from 'crypto';
import { env } from '@/config/env';

const ALGO = 'aes-256-gcm';

/** Derive a stable 32-byte key from the configured secret. */
function key(): Buffer {
  return crypto.createHash('sha256').update(env.FIELD_ENCRYPTION_KEY).digest();
}

export function encryptField(plain: string): string {
  if (!plain) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptField(payload: string): string {
  if (!payload || !payload.startsWith('v1:')) return payload;
  const [, ivB64, tagB64, dataB64] = payload.split(':');
  const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return dec.toString('utf8');
}

/** Show only the last `visible` characters, e.g. PAN -> "XXXXXX1234F". */
export function maskSensitive(plain: string, visible = 4): string {
  if (!plain) return '';
  if (plain.length <= visible) return '*'.repeat(plain.length);
  return '*'.repeat(plain.length - visible) + plain.slice(-visible);
}
