import { z } from 'zod';

// ─── Leave Type ─────────────────────────────────────────────────────────────

export const leaveTypeCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  code: z.string().trim().toUpperCase().min(1, 'Code is required'),
  description: z.string().trim().optional(),
  annualQuota: z.coerce.number().min(0, 'Quota cannot be negative').default(0),
  paid: z.coerce.boolean().default(true),
  carryForward: z.coerce.boolean().default(false),
  maxCarryForward: z.coerce.number().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const leaveTypeUpdateSchema = leaveTypeCreateSchema.partial();

export type LeaveTypeCreateInput = z.infer<typeof leaveTypeCreateSchema>;
export type LeaveTypeUpdateInput = z.infer<typeof leaveTypeUpdateSchema>;

// ─── Leave Request ──────────────────────────────────────────────────────────

export const leaveRequestCreateSchema = z
  .object({
    employeeId: z.string().trim().min(1, 'Employee is required'),
    leaveTypeId: z.string().trim().min(1, 'Leave type is required'),
    fromDate: z.coerce.date({ message: 'From date is required' }),
    toDate: z.coerce.date({ message: 'To date is required' }),
    days: z.coerce.number().min(0.5, 'At least half a day'),
    reason: z.string().trim().optional(),
  })
  .refine((v) => v.toDate >= v.fromDate, {
    message: 'To date must be on or after from date',
    path: ['toDate'],
  });

export const leaveRequestUpdateSchema = z.object({
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  days: z.coerce.number().min(0.5).optional(),
  reason: z.string().trim().optional(),
});

/** Approve / reject decision payload. */
export const leaveDecisionSchema = z.object({
  decisionNote: z.string().trim().optional(),
});

export type LeaveRequestCreateInput = z.infer<typeof leaveRequestCreateSchema>;
export type LeaveRequestUpdateInput = z.infer<typeof leaveRequestUpdateSchema>;
export type LeaveDecisionInput = z.infer<typeof leaveDecisionSchema>;
