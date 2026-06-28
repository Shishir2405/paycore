/**
 * Payroll Run — one monthly payroll cycle for the company (the header). It owns
 * the aggregate totals and the maker/checker lifecycle; the per-employee detail
 * lives in PayrollEntry rows referencing this run. A run moves Draft → Calculated
 * → Approved → Locked; once Locked it is the immutable record for that month.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const PAYROLL_RUN_STATUSES = ['Draft', 'Calculated', 'Approved', 'Locked'] as const;
export type PayrollRunStatus = (typeof PAYROLL_RUN_STATUSES)[number];

export type PayrollRunTotals = {
  gross: number;
  deductions: number;
  net: number;
  /** Employer cost (gross + employer PF/ESI) — informational. */
  employerCost: number;
  headcount: number;
};

export type PayrollRunDoc = WithBase<{
  /** Payroll month, 1-12. */
  month: number;
  year: number;
  status: PayrollRunStatus;
  totals: PayrollRunTotals;
  /** Who calculated the run (maker). */
  makerId?: Types.ObjectId | null;
  /** Who approved it (checker) — enforces maker-checker separation in the UI. */
  checkerId?: Types.ObjectId | null;
  lockedAt?: Date | null;
  notes?: string;
}>;

const PayrollRunTotalsSchema = new Schema<PayrollRunTotals>(
  {
    gross: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    net: { type: Number, default: 0, min: 0 },
    employerCost: { type: Number, default: 0, min: 0 },
    headcount: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const PayrollRunSchema = new Schema<PayrollRunDoc>(
  {
    ...baseFields,

    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 2000 },
    status: { type: String, enum: PAYROLL_RUN_STATUSES, default: 'Draft', index: true },
    totals: { type: PayrollRunTotalsSchema, default: () => ({}) },
    makerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    checkerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    lockedAt: { type: Date, default: null },
    notes: { type: String, trim: true },
  },
  baseSchemaOptions,
);

// One conceptual run per (company, month, year); supporting list index.
PayrollRunSchema.index({ companyId: 1, year: -1, month: -1, isDeleted: 1 });

export const PayrollRun: Model<PayrollRunDoc> =
  (models.PayrollRun as Model<PayrollRunDoc>) ?? model<PayrollRunDoc>('PayrollRun', PayrollRunSchema);
