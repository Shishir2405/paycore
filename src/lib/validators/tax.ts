import { z } from 'zod';
import { TAX_REGIMES } from '@/models/Employee';
import { TAX_DECLARATION_STATUSES } from '@/models/TaxDeclaration';

/** FY label like "2024-25". */
const FY_RE = /^\d{4}-\d{2}$/;

export const taxSectionSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, 'Section code is required'),
  label: z.string().trim().optional(),
  declaredAmount: z.coerce.number().min(0, 'Amount cannot be negative').default(0),
  proofAmount: z.coerce.number().min(0, 'Amount cannot be negative').default(0),
  verified: z.boolean().optional(),
});

export const taxDeclarationCreateSchema = z.object({
  employeeId: z.string().trim().min(1, 'Employee is required'),
  financialYear: z.string().trim().regex(FY_RE, 'Use FY format like 2024-25'),
  regime: z.enum(TAX_REGIMES).optional(),
  sections: z.array(taxSectionSchema).default([]),
  status: z.enum(TAX_DECLARATION_STATUSES).optional(),
});

export const taxDeclarationUpdateSchema = z.object({
  regime: z.enum(TAX_REGIMES).optional(),
  sections: z.array(taxSectionSchema).optional(),
  status: z.enum(TAX_DECLARATION_STATUSES).optional(),
});

/** Verifying a declaration: optionally mark each section's proof as verified. */
export const taxDeclarationVerifySchema = z.object({
  /** When true, set every section's `verified` flag. */
  markSectionsVerified: z.boolean().optional(),
});

export const regimeCompareSchema = z.object({
  grossIncome: z.coerce.number().min(0, 'Gross income cannot be negative'),
  deductions: z.coerce.number().min(0, 'Deductions cannot be negative').default(0),
});

export type TaxSectionInput = z.infer<typeof taxSectionSchema>;
export type TaxDeclarationCreateInput = z.infer<typeof taxDeclarationCreateSchema>;
export type TaxDeclarationUpdateInput = z.infer<typeof taxDeclarationUpdateSchema>;
export type TaxDeclarationVerifyInput = z.infer<typeof taxDeclarationVerifySchema>;
export type RegimeCompareInput = z.infer<typeof regimeCompareSchema>;
