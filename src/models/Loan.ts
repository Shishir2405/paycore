/**
 * Staff loan / salary advance. The EMI and full repayment schedule are computed
 * by the service (reducing-balance) at creation; this document holds the headline
 * terms plus a live `outstanding` balance that the payroll engine decrements.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const LOAN_STATUSES = ['Active', 'Closed'] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number];

export type LoanDoc = WithBase<{
  employeeId: Types.ObjectId;
  principal: number;
  /** Annual interest rate, percent per annum (reducing balance). */
  interestRatePa: number;
  tenureMonths: number;
  emi: number;
  /** Remaining principal still to be recovered. */
  outstanding: number;
  /** First deduction month, "YYYY-MM". */
  startMonth: string;
  status: LoanStatus;
  notes?: string;
}>;

const LoanSchema = new Schema<LoanDoc>(
  {
    ...baseFields,
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    principal: { type: Number, required: true, min: 0 },
    interestRatePa: { type: Number, required: true, min: 0, default: 0 },
    tenureMonths: { type: Number, required: true, min: 1 },
    emi: { type: Number, required: true, min: 0, default: 0 },
    outstanding: { type: Number, required: true, min: 0, default: 0 },
    startMonth: { type: String, required: true, trim: true },
    status: { type: String, enum: LOAN_STATUSES, default: 'Active', index: true },
    notes: { type: String, trim: true },
  },
  baseSchemaOptions,
);

LoanSchema.index({ companyId: 1, employeeId: 1, status: 1 });
LoanSchema.index({ companyId: 1, status: 1, isDeleted: 1 });

export const Loan: Model<LoanDoc> =
  (models.Loan as Model<LoanDoc>) ?? model<LoanDoc>('Loan', LoanSchema);
