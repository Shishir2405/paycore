import { z } from 'zod';
import { COMPLIANCE_TYPES, COMPLIANCE_STATUSES } from '@/models/ComplianceItem';
import { PT_FREQUENCIES } from '@/models/PTSlab';
import { LWF_FREQUENCIES } from '@/models/LWFRule';

// ─── Compliance calendar items ──────────────────────────────────────────────
export const complianceItemCreateSchema = z.object({
  type: z.enum(COMPLIANCE_TYPES),
  period: z.string().trim().min(1, 'Period is required'),
  dueDate: z.coerce.date({ message: 'Due date is required' }),
  status: z.enum(COMPLIANCE_STATUSES).optional(),
  amount: z.coerce.number().min(0).optional(),
  reference: z.string().trim().optional(),
  filedDate: z.coerce.date().optional(),
  notes: z.string().trim().optional(),
});

export const complianceItemUpdateSchema = complianceItemCreateSchema.partial();

export type ComplianceItemCreateInput = z.infer<typeof complianceItemCreateSchema>;
export type ComplianceItemUpdateInput = z.infer<typeof complianceItemUpdateSchema>;

// ─── PT slabs ───────────────────────────────────────────────────────────────
export const ptSlabCreateSchema = z.object({
  stateCode: z.string().trim().toUpperCase().min(1, 'State code is required'),
  fromAmount: z.coerce.number().min(0),
  toAmount: z.coerce.number().min(0).nullable().optional(),
  amount: z.coerce.number().min(0),
  frequency: z.enum(PT_FREQUENCIES).optional(),
  month: z.coerce.number().int().min(1).max(12).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const ptSlabUpdateSchema = ptSlabCreateSchema.partial();

export type PtSlabCreateInput = z.infer<typeof ptSlabCreateSchema>;
export type PtSlabUpdateInput = z.infer<typeof ptSlabUpdateSchema>;

// ─── LWF rules ──────────────────────────────────────────────────────────────
export const lwfRuleCreateSchema = z.object({
  stateCode: z.string().trim().toUpperCase().min(1, 'State code is required'),
  employeeAmount: z.coerce.number().min(0),
  employerAmount: z.coerce.number().min(0),
  frequency: z.enum(LWF_FREQUENCIES).optional(),
  deductionMonths: z.array(z.coerce.number().int().min(1).max(12)).optional(),
  isActive: z.boolean().optional(),
});

export const lwfRuleUpdateSchema = lwfRuleCreateSchema.partial();

export type LwfRuleCreateInput = z.infer<typeof lwfRuleCreateSchema>;
export type LwfRuleUpdateInput = z.infer<typeof lwfRuleUpdateSchema>;

// ─── Statutory calculator request ───────────────────────────────────────────
export const calculateSchema = z.object({
  /** Basic + DA — the PF wage. */
  basic: z.coerce.number().min(0),
  /** Monthly gross — used for ESI applicability and PT slab lookup. */
  gross: z.coerce.number().min(0),
  stateCode: z.string().trim().toUpperCase().min(1, 'State code is required'),
  /** 1-12; honours month-specific PT slabs and LWF deduction months. */
  month: z.coerce.number().int().min(1).max(12).optional(),
  /** Cap PF 12% contributions at the wage ceiling (company policy). */
  capPfContribution: z.boolean().optional(),
});

export type CalculateInput = z.infer<typeof calculateSchema>;
