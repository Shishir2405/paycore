import { z } from 'zod';
import { PAY_HEAD_TYPES, PAY_HEAD_CALC_TYPES } from '@/models/PayHead';
import { validateFormula } from '@/lib/payroll/pay-head-eval';

const CODE_RE = /^[A-Z0-9_]+$/;

/** Shared between client form and server route — single source of truth. */
export const payHeadCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(1, 'Code is required')
      .regex(CODE_RE, 'Code may contain only letters, digits, and underscore'),
    type: z.enum(PAY_HEAD_TYPES),
    calcType: z.enum(PAY_HEAD_CALC_TYPES),
    value: z.coerce.number().min(0, 'Value cannot be negative').default(0),
    formula: z.string().trim().optional().or(z.literal('')),
    taxable: z.coerce.boolean().optional(),
    isStatutory: z.coerce.boolean().optional(),
    affectsPf: z.coerce.boolean().optional(),
    affectsEsi: z.coerce.boolean().optional(),
    displayOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.coerce.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.calcType === 'Formula') {
      const expr = (data.formula ?? '').trim();
      if (!expr) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['formula'], message: 'Formula is required for Formula calc type' });
        return;
      }
      const err = validateFormula(expr);
      if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['formula'], message: err });
    }
  });

export const payHeadUpdateSchema = payHeadCreateSchema;

export type PayHeadCreateInput = z.infer<typeof payHeadCreateSchema>;
export type PayHeadUpdateInput = z.infer<typeof payHeadUpdateSchema>;
