import { z } from 'zod';
import { HELPDESK_CATEGORIES, HELPDESK_STATUSES } from '@/models/HelpdeskTicket';
import { PROFILE_CHANGE_FIELDS } from '@/models/ProfileChangeRequest';

// ─── Helpdesk ───────────────────────────────────────────────────────────────

export const helpdeskCreateSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required'),
  category: z.enum(HELPDESK_CATEGORIES).default('Other'),
  message: z.string().trim().min(1, 'Please describe your issue'),
});

/** Reply to an existing ticket (employee follow-up or HR response). */
export const helpdeskRespondSchema = z.object({
  message: z.string().trim().min(1, 'Message is required'),
  /** Optional status transition applied alongside the reply (HR only). */
  status: z.enum(HELPDESK_STATUSES).optional(),
});

export type HelpdeskCreateInput = z.infer<typeof helpdeskCreateSchema>;
export type HelpdeskRespondInput = z.infer<typeof helpdeskRespondSchema>;

// ─── Profile change request ───────────────────────────────────────────────────

export const profileChangeCreateSchema = z.object({
  field: z.enum(PROFILE_CHANGE_FIELDS),
  newValue: z.string().trim().min(1, 'A new value is required'),
  reason: z.string().trim().optional(),
});

export type ProfileChangeCreateInput = z.infer<typeof profileChangeCreateSchema>;
