import { z } from 'zod';

/**
 * Settings update validator — shared by client form and server route.
 *
 * Credential inputs are OPTIONAL: the UI shows masked placeholders and only
 * sends a value when the admin types a NEW secret. An empty string means
 * "leave unchanged" and is dropped server-side, so secrets are never wiped by a
 * normal save.
 */
const optionalSecret = z.string().optional();

export const settingsUpdateSchema = z.object({
  email: z
    .object({
      activeProvider: z.enum(['gmail', 'brevo']).optional(),
      fromName: z.string().trim().optional(),
      fromEmail: z.string().email('Invalid from email').optional().or(z.literal('')),
      gmail: z
        .object({
          user: z.string().trim().email('Invalid Gmail address').optional().or(z.literal('')),
          appPassword: optionalSecret,
        })
        .optional(),
      brevo: z
        .object({
          apiKey: optionalSecret,
        })
        .optional(),
    })
    .optional(),

  sms: z
    .object({
      activeProvider: z.enum(['msg91', 'twilio']).optional(),
      enabled: z.boolean().optional(),
      msg91: z
        .object({
          apiKey: optionalSecret,
          senderId: z.string().trim().optional(),
        })
        .optional(),
    })
    .optional(),

  payroll: z
    .object({
      payDay: z.coerce.number().int().min(1).max(28).optional(),
      currency: z.string().trim().optional(),
      financialYearStartMonth: z.coerce.number().int().min(1).max(12).optional(),
      lockOnApproval: z.boolean().optional(),
      anomalyThresholdPct: z.coerce.number().min(0).optional(),
    })
    .optional(),

  general: z
    .object({
      dateFormat: z.string().trim().optional(),
      timezone: z.string().trim().optional(),
      weekStartsOn: z.coerce.number().int().min(0).max(6).optional(),
      weeklyOffDays: z.array(z.coerce.number().int().min(0).max(6)).optional(),
      employeeCodePrefix: z.string().trim().optional(),
    })
    .optional(),
});

export const testEmailSchema = z.object({
  to: z.string().email('A valid recipient email is required'),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
export type TestEmailInput = z.infer<typeof testEmailSchema>;
