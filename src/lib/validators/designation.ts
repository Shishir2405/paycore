import { z } from 'zod';

/** Shared between client form and server route — single source of truth. */
export const designationCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  code: z.string().trim().toUpperCase().min(1, 'Code is required'),
  description: z.string().trim().optional(),
  grade: z.string().trim().optional(),
  band: z.string().trim().optional(),
  level: z.coerce.number().int('Level must be a whole number').min(0, 'Level cannot be negative').optional(),
  ctcRange: z
    .object({
      min: z.coerce.number().min(0).optional(),
      max: z.coerce.number().min(0).optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
});

export const designationUpdateSchema = designationCreateSchema.partial();

export type DesignationCreateInput = z.infer<typeof designationCreateSchema>;
export type DesignationUpdateInput = z.infer<typeof designationUpdateSchema>;
