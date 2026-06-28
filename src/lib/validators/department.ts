import { z } from 'zod';

/** Shared between client form and server route — single source of truth. */
export const departmentCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  code: z.string().trim().toUpperCase().min(1, 'Code is required'),
  description: z.string().trim().optional(),
  parentId: z.string().optional().or(z.literal('')),
  headEmployeeId: z.string().optional().or(z.literal('')),
  budgetAnnual: z.coerce.number().min(0, 'Budget cannot be negative').optional(),
  isActive: z.boolean().optional(),
});

export const departmentUpdateSchema = departmentCreateSchema.partial();

export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;
