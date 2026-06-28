/** Compute a field-level before/after diff for the audit trail. */
import type { AuditChange } from '@/models/AuditLog';

/** Fields that must never be written to the audit log in cleartext. */
const REDACTED = new Set([
  'passwordHash',
  'panEnc',
  'aadhaarEnc',
  'twoFactorSecret',
  'accountNumberEnc',
  'appPasswordEnc',
  'apiKeyEnc',
  'authTokenEnc',
  'accountSidEnc',
]);

export function computeDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
  fields?: string[],
): AuditChange[] {
  const keys = fields ?? Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after)]));
  const changes: AuditChange[] = [];

  for (const field of keys) {
    if (field === 'updatedAt' || field === 'createdAt' || field === '__v') continue;
    const from = before?.[field];
    const to = after[field];
    if (serialize(from) === serialize(to)) continue;

    changes.push({
      field,
      from: REDACTED.has(field) ? '«redacted»' : from ?? null,
      to: REDACTED.has(field) ? '«redacted»' : to ?? null,
    });
  }
  return changes;
}

function serialize(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
