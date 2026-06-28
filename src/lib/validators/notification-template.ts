import { z } from 'zod';
import { NOTIFICATION_CHANNELS } from '@/models/NotificationTemplate';

/** Shared by client form and server route. */
export const notificationTemplateCreateSchema = z
  .object({
    event: z.string().trim().min(1, 'Event is required'),
    channel: z.enum(NOTIFICATION_CHANNELS),
    subject: z.string().trim().optional(),
    body: z.string().trim().min(1, 'Body is required'),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.channel !== 'Email' || (v.subject && v.subject.length > 0), {
    message: 'Subject is required for email templates',
    path: ['subject'],
  });

export const notificationTemplateUpdateSchema = z.object({
  event: z.string().trim().min(1).optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  subject: z.string().trim().optional(),
  body: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const twoFactorVerifySchema = z.object({
  token: z.string().trim().regex(/^[0-9]{6}$/, 'Enter the 6-digit code'),
});

export type NotificationTemplateCreateInput = z.infer<typeof notificationTemplateCreateSchema>;
export type NotificationTemplateUpdateInput = z.infer<typeof notificationTemplateUpdateSchema>;
export type TwoFactorVerifyInput = z.infer<typeof twoFactorVerifySchema>;
