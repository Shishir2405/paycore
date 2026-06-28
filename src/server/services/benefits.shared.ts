/**
 * Shared helpers for the Benefits & Deductions services. Centralizes the
 * employee-reference mapper so loans, reimbursements, insurance, and deductions
 * all surface the same `{ id, code, name }` shape for a populated employeeId.
 */
import type { EmployeeDoc } from '@/models/Employee';

export type EmployeeRef = {
  id: string;
  employeeCode?: string;
  fullName?: string;
};

/**
 * Normalize a populated-or-raw `employeeId`. After `.populate('employeeId')` the
 * field is an EmployeeDoc; otherwise it is an ObjectId. Handles both lean shapes.
 */
export function toEmployeeRef(value: unknown): EmployeeRef {
  if (value && typeof value === 'object' && ('firstName' in value || 'employeeCode' in value)) {
    const e = value as Partial<EmployeeDoc> & { _id: unknown };
    return {
      id: String(e._id),
      employeeCode: e.employeeCode,
      fullName: [e.firstName, e.lastName].filter(Boolean).join(' ') || undefined,
    };
  }
  return { id: String(value) };
}

/** Round to 2dp (INR). */
export function money2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
