/**
 * Audit writer. Services call `recordAudit` after every mutation. Writes are
 * best-effort and never throw into the request path — losing a request because
 * the audit insert failed would be worse than the gap (which is itself logged).
 */
import { AuditLog, type AuditAction, type AuditChange } from '@/models/AuditLog';
import type { AuthContext } from '@/types';

export type AuditInput = {
  action: AuditAction;
  module: string;
  entityId?: string;
  summary: string;
  changes?: AuditChange[];
  meta?: { ip?: string; userAgent?: string };
};

export async function recordAudit(ctx: AuthContext, input: AuditInput): Promise<void> {
  try {
    await AuditLog.create({
      companyId: ctx.companyId,
      actorId: ctx.userId,
      actorName: ctx.name,
      action: input.action,
      module: input.module,
      entityId: input.entityId,
      summary: input.summary,
      changes: input.changes ?? [],
      ip: input.meta?.ip,
      userAgent: input.meta?.userAgent,
    });
  } catch (err) {
    console.error('[audit] failed to write log:', err);
  }
}

/** Extract client IP + UA from a request for the audit record. */
export function requestMeta(req: Request): { ip?: string; userAgent?: string } {
  const fwd = req.headers.get('x-forwarded-for');
  return {
    ip: fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  };
}
