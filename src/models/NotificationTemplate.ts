/**
 * Per-company notification templates. Each row binds a system event (e.g.
 * "payslip.published") to a channel (Email or Sms) plus the subject/body that
 * gets rendered when the event fires. Bodies may contain {{handlebars}}-style
 * tokens resolved at send-time by the dispatching service.
 */
import { Schema, model, models, type Model } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const NOTIFICATION_CHANNELS = ['Email', 'Sms'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/** Known events the system can notify on. Extend as modules grow. */
export const NOTIFICATION_EVENTS = [
  'employee.welcome',
  'payslip.published',
  'leave.requested',
  'leave.approved',
  'leave.rejected',
  'payroll.approved',
  'password.reset',
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export type NotificationTemplateDoc = WithBase<{
  event: string;
  channel: NotificationChannel;
  /** Subject is required for Email; ignored for Sms. */
  subject?: string;
  body: string;
  isActive: boolean;
}>;

const NotificationTemplateSchema = new Schema<NotificationTemplateDoc>(
  {
    ...baseFields,
    event: { type: String, required: true, trim: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true, default: 'Email' },
    subject: { type: String, trim: true },
    body: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

// One template per (event, channel) within a company.
NotificationTemplateSchema.index({ companyId: 1, event: 1, channel: 1 }, { unique: true });

export const NotificationTemplate: Model<NotificationTemplateDoc> =
  (models.NotificationTemplate as Model<NotificationTemplateDoc>) ??
  model<NotificationTemplateDoc>('NotificationTemplate', NotificationTemplateSchema);
