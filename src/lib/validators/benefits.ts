import { z } from 'zod';
import { LOAN_STATUSES } from '@/models/Loan';
import { REIMBURSEMENT_TYPES, REIMBURSEMENT_STATUSES } from '@/models/Reimbursement';

/** "YYYY-MM" payroll month token, e.g. "2026-06". */
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const monthField = z.string().trim().regex(MONTH_RE, 'Use YYYY-MM, e.g. 2026-06');

// ─── Loans ──────────────────────────────────────────────────────────────────

export const loanCreateSchema = z.object({
  employeeId: z.string().trim().min(1, 'Employee is required'),
  principal: z.coerce.number().positive('Principal must be greater than 0'),
  interestRatePa: z.coerce.number().min(0, 'Rate cannot be negative').default(0),
  tenureMonths: z.coerce.number().int().min(1, 'Tenure must be at least 1 month'),
  startMonth: monthField,
  notes: z.string().trim().optional(),
});

export const loanUpdateSchema = z
  .object({
    status: z.enum(LOAN_STATUSES),
    notes: z.string().trim().optional(),
  })
  .partial();

export type LoanCreateInput = z.infer<typeof loanCreateSchema>;
export type LoanUpdateInput = z.infer<typeof loanUpdateSchema>;

// ─── Reimbursements ───────────────────────────────────────────────────────────

export const reimbursementCreateSchema = z.object({
  employeeId: z.string().trim().min(1, 'Employee is required'),
  type: z.enum(REIMBURSEMENT_TYPES).default('Other'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  date: z.coerce.date({ message: 'Date is required' }),
  description: z.string().trim().optional(),
  receiptUrl: z.string().trim().url('Invalid URL').optional().or(z.literal('')),
});

export const reimbursementUpdateSchema = reimbursementCreateSchema.partial();

export const reimbursementDecisionSchema = z.object({
  note: z.string().trim().optional(),
});

export type ReimbursementCreateInput = z.infer<typeof reimbursementCreateSchema>;
export type ReimbursementUpdateInput = z.infer<typeof reimbursementUpdateSchema>;
export type ReimbursementDecisionInput = z.infer<typeof reimbursementDecisionSchema>;

// ─── Insurance policies ───────────────────────────────────────────────────────

export const insurancePolicyCreateSchema = z.object({
  employeeId: z.string().trim().min(1, 'Employee is required'),
  policyNo: z.string().trim().min(1, 'Policy number is required'),
  provider: z.string().trim().min(1, 'Provider is required'),
  sumInsured: z.coerce.number().min(0, 'Sum insured cannot be negative').default(0),
  premiumMonthly: z.coerce.number().min(0, 'Premium cannot be negative').default(0),
  isActive: z.boolean().optional(),
});

export const insurancePolicyUpdateSchema = insurancePolicyCreateSchema.partial();

export type InsurancePolicyCreateInput = z.infer<typeof insurancePolicyCreateSchema>;
export type InsurancePolicyUpdateInput = z.infer<typeof insurancePolicyUpdateSchema>;

// ─── Deductions ───────────────────────────────────────────────────────────────

export const deductionCreateSchema = z.object({
  employeeId: z.string().trim().min(1, 'Employee is required'),
  name: z.string().trim().min(1, 'Name is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  recurring: z.boolean().default(false),
  month: monthField,
  isActive: z.boolean().optional(),
});

export const deductionUpdateSchema = deductionCreateSchema.partial();

export type DeductionCreateInput = z.infer<typeof deductionCreateSchema>;
export type DeductionUpdateInput = z.infer<typeof deductionUpdateSchema>;

// Re-export status enums for client filter UIs that need the canonical lists.
export { REIMBURSEMENT_STATUSES, REIMBURSEMENT_TYPES, LOAN_STATUSES };
