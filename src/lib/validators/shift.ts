import { z } from 'zod';

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Shared between the shift form and the server route. */
export const shiftCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  code: z.string().trim().toUpperCase().min(1, 'Code is required'),
  startTime: z.string().trim().regex(HHMM_RE, 'Use HH:mm (24h)'),
  endTime: z.string().trim().regex(HHMM_RE, 'Use HH:mm (24h)'),
  breakMinutes: z.coerce.number().int().min(0).max(480).default(60),
  weeklyOffDays: z.array(z.coerce.number().int().min(0).max(6)).default([0]),
  isActive: z.boolean().optional(),
});

export const shiftUpdateSchema = shiftCreateSchema.partial();

export type ShiftCreateInput = z.infer<typeof shiftCreateSchema>;
export type ShiftUpdateInput = z.infer<typeof shiftUpdateSchema>;
