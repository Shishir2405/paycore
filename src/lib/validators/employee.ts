import { z } from 'zod';
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from '@/models/Employee';

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_RE = /^[0-9]{12}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Shared between client form and server route — single source of truth. */
export const employeeCreateSchema = z.object({
  employeeCode: z.string().trim().toUpperCase().optional(),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().trim().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  dateOfBirth: z.coerce.date().optional(),
  dateOfJoining: z.coerce.date({ message: 'Date of joining is required' }),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  reportingManagerId: z.string().optional(),
  locationName: z.string().optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),

  pan: z.string().trim().toUpperCase().regex(PAN_RE, 'Invalid PAN').optional().or(z.literal('')),
  aadhaar: z.string().trim().regex(AADHAAR_RE, 'Aadhaar must be 12 digits').optional().or(z.literal('')),
  uan: z.string().trim().optional(),
  esicNumber: z.string().trim().optional(),

  bank: z
    .object({
      accountNumber: z.string().trim().optional(),
      ifsc: z.string().trim().toUpperCase().regex(IFSC_RE, 'Invalid IFSC').optional().or(z.literal('')),
      bankName: z.string().trim().optional(),
      accountHolderName: z.string().trim().optional(),
    })
    .optional(),

  status: z.enum(EMPLOYEE_STATUSES).optional(),
});

export const employeeUpdateSchema = employeeCreateSchema.partial();

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
