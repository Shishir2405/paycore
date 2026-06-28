import { z } from 'zod';
import { ARREAR_STATUSES } from '@/models/Arrear';
import { BONUS_TYPES } from '@/models/Bonus';
import { SETTLEMENT_STATUSES } from '@/models/FinalSettlement';
import { PAY_HEAD_TYPES } from '@/models/PayHead';

const monthField = z.coerce.number().int().min(1, 'Month must be 1-12').max(12, 'Month must be 1-12');
const yearField = z.coerce.number().int().min(2000, 'Invalid year').max(2100, 'Invalid year');
const objectId = z.string().trim().min(1, 'Required');

// ─── Salary Structure ─────────────────────────────────────────────────────────

const structureHeadSchema = z.object({
  payHeadId: z.string().trim().optional().or(z.literal('')),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Code is required')
    .regex(/^[A-Z0-9_]+$/, 'Code may contain only letters, digits, and underscore'),
  name: z.string().trim().min(1, 'Name is required'),
  type: z.enum(PAY_HEAD_TYPES),
  amount: z.coerce.number().min(0, 'Amount cannot be negative').default(0),
});

export const salaryStructureCreateSchema = z.object({
  employeeId: objectId,
  effectiveFrom: z.coerce.date({ message: 'Effective date is required' }),
  basic: z.coerce.number().min(0, 'Basic cannot be negative'),
  heads: z.array(structureHeadSchema).default([]),
});

export const salaryStructureUpdateSchema = salaryStructureCreateSchema
  .extend({ isActive: z.coerce.boolean() })
  .partial();

export type SalaryStructureHeadInput = z.infer<typeof structureHeadSchema>;
export type SalaryStructureCreateInput = z.infer<typeof salaryStructureCreateSchema>;
export type SalaryStructureUpdateInput = z.infer<typeof salaryStructureUpdateSchema>;

// ─── Payroll Run ──────────────────────────────────────────────────────────────

/** Calculate (create) a payroll run for a given period. */
export const payrollRunCreateSchema = z.object({
  month: monthField,
  year: yearField,
  notes: z.string().trim().optional(),
});

/** Decision payload for approve / lock actions. */
export const payrollRunDecisionSchema = z.object({
  notes: z.string().trim().optional(),
});

export type PayrollRunCreateInput = z.infer<typeof payrollRunCreateSchema>;
export type PayrollRunDecisionInput = z.infer<typeof payrollRunDecisionSchema>;

// ─── Arrears ──────────────────────────────────────────────────────────────────

export const arrearCreateSchema = z.object({
  employeeId: z.string().trim().min(1, 'Employee is required'),
  month: monthField,
  year: yearField,
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  reason: z.string().trim().min(1, 'Reason is required'),
  status: z.enum(ARREAR_STATUSES).optional(),
});

export const arrearUpdateSchema = arrearCreateSchema.partial();

export type ArrearCreateInput = z.infer<typeof arrearCreateSchema>;
export type ArrearUpdateInput = z.infer<typeof arrearUpdateSchema>;

// ─── Bonuses ──────────────────────────────────────────────────────────────────

export const bonusCreateSchema = z.object({
  employeeId: z.string().trim().min(1, 'Employee is required'),
  type: z.enum(BONUS_TYPES).default('Discretionary'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  month: monthField,
  year: yearField,
  notes: z.string().trim().optional(),
});

export const bonusUpdateSchema = bonusCreateSchema.partial();

export type BonusCreateInput = z.infer<typeof bonusCreateSchema>;
export type BonusUpdateInput = z.infer<typeof bonusUpdateSchema>;

// ─── Final Settlement ─────────────────────────────────────────────────────────

export const finalSettlementCreateSchema = z.object({
  employeeId: z.string().trim().min(1, 'Employee is required'),
  lastWorkingDay: z.coerce.date({ message: 'Last working day is required' }),
  leaveEncashment: z.coerce.number().min(0).default(0),
  gratuity: z.coerce.number().min(0).default(0),
  noticeRecovery: z.coerce.number().min(0).default(0),
  otherDues: z.coerce.number().min(0).default(0),
  notes: z.string().trim().optional(),
});

export const finalSettlementUpdateSchema = finalSettlementCreateSchema
  .extend({ status: z.enum(SETTLEMENT_STATUSES) })
  .partial();

export type FinalSettlementCreateInput = z.infer<typeof finalSettlementCreateSchema>;
export type FinalSettlementUpdateInput = z.infer<typeof finalSettlementUpdateSchema>;
