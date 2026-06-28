import { z } from 'zod';

/**
 * Audit-trail list/export filters. Shared by the client page and the server
 * routes so the query contract stays in one place. All fields optional — an
 * empty filter returns the full (paginated) trail.
 */
export const AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'approve',
  'export',
  'import',
] as const;

export const auditFilterSchema = z.object({
  module: z.string().trim().optional(),
  action: z.enum(AUDIT_ACTIONS).optional(),
  /** Filter by the actor (user) who performed the action. */
  actorId: z.string().trim().optional(),
  /** Inclusive lower bound on the event timestamp. */
  from: z.coerce.date().optional(),
  /** Inclusive upper bound on the event timestamp. */
  to: z.coerce.date().optional(),
});

export type AuditFilterInput = z.infer<typeof auditFilterSchema>;
