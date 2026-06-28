/**
 * Per-company runtime configuration. One document per company.
 *
 * The email/SMS provider toggle lives HERE (not in env) so an admin can switch
 * providers from the UI with no redeploy. Credentials are stored encrypted.
 */
import { Schema, model, models, type Model } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export type EmailProviderKey = 'gmail' | 'brevo';
export type SmsProviderKey = 'msg91' | 'twilio';

export type SettingsDoc = WithBase<{
  email: {
    activeProvider: EmailProviderKey;
    fromName: string;
    fromEmail: string;
    gmail: { user?: string; appPasswordEnc?: string };
    brevo: { apiKeyEnc?: string };
  };
  sms: {
    activeProvider: SmsProviderKey;
    enabled: boolean;
    msg91: { apiKeyEnc?: string; senderId?: string };
    twilio: { accountSidEnc?: string; authTokenEnc?: string; fromNumber?: string };
  };
  payroll: {
    /** Day of month payroll is finalized; used for reminders. */
    payDay: number;
    currency: string;
    financialYearStartMonth: number; // 1-12 (India: 4 = April)
    /** Lock the run after approval; reopening requires an audited override. */
    lockOnApproval: boolean;
    /** Flag a payroll run when net pay swings more than this % vs last month. */
    anomalyThresholdPct: number;
  };
  general: {
    dateFormat: string;
    timezone: string;
    weekStartsOn: number; // 0 = Sunday
    weeklyOffDays: number[]; // 0-6
    employeeCodePrefix: string;
    employeeCodeNextSeq: number;
  };
}>;

const SettingsSchema = new Schema<SettingsDoc>(
  {
    ...baseFields,
    email: {
      activeProvider: { type: String, enum: ['gmail', 'brevo'], default: 'gmail' },
      fromName: { type: String, default: 'PayCore' },
      fromEmail: { type: String, default: '' },
      gmail: {
        user: { type: String, default: '' },
        appPasswordEnc: { type: String, default: '', select: false },
      },
      brevo: {
        apiKeyEnc: { type: String, default: '', select: false },
      },
    },
    sms: {
      activeProvider: { type: String, enum: ['msg91', 'twilio'], default: 'msg91' },
      enabled: { type: Boolean, default: false },
      msg91: {
        apiKeyEnc: { type: String, default: '', select: false },
        senderId: { type: String, default: '' },
      },
      twilio: {
        accountSidEnc: { type: String, default: '', select: false },
        authTokenEnc: { type: String, default: '', select: false },
        fromNumber: { type: String, default: '' },
      },
    },
    payroll: {
      payDay: { type: Number, default: 1, min: 1, max: 28 },
      currency: { type: String, default: 'INR' },
      financialYearStartMonth: { type: Number, default: 4, min: 1, max: 12 },
      lockOnApproval: { type: Boolean, default: true },
      anomalyThresholdPct: { type: Number, default: 15, min: 0 },
    },
    general: {
      dateFormat: { type: String, default: 'dd MMM yyyy' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      weekStartsOn: { type: Number, default: 1, min: 0, max: 6 },
      weeklyOffDays: { type: [Number], default: [0] },
      employeeCodePrefix: { type: String, default: 'EMP' },
      employeeCodeNextSeq: { type: Number, default: 1 },
    },
  },
  baseSchemaOptions,
);

SettingsSchema.index({ companyId: 1 }, { unique: true });

export const Settings: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) ?? model<SettingsDoc>('Settings', SettingsSchema);
