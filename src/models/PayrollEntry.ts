/**
 * Payroll Entry — one employee's computed payslip within a PayrollRun. Stores the
 * resolved earnings/deductions line items plus the statutory split (PF/ESI/PT/TDS)
 * and the LOP (loss-of-pay) days, so a run is fully reproducible without re-running
 * the engine. Denormalizes employeeCode/employeeName for fast list rendering.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export type EntryLine = {
  code: string;
  name: string;
  amount: number;
};

export type PayrollEntryDoc = WithBase<{
  runId: Types.ObjectId;
  employeeId: Types.ObjectId;
  employeeCode: string;
  employeeName: string;
  earnings: EntryLine[];
  deductions: EntryLine[];
  gross: number;
  totalDeductions: number;
  net: number;
  /** Statutory amounts (employee share where applicable). */
  pf: number;
  esi: number;
  pt: number;
  tds: number;
  /** Loss-of-pay days deducted this cycle. */
  lop: number;
}>;

const EntryLineSchema = new Schema<EntryLine>(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const PayrollEntrySchema = new Schema<PayrollEntryDoc>(
  {
    ...baseFields,

    runId: { type: Schema.Types.ObjectId, ref: 'PayrollRun', required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    employeeCode: { type: String, required: true, trim: true },
    employeeName: { type: String, required: true, trim: true },
    earnings: { type: [EntryLineSchema], default: [] },
    deductions: { type: [EntryLineSchema], default: [] },
    gross: { type: Number, default: 0, min: 0 },
    totalDeductions: { type: Number, default: 0, min: 0 },
    net: { type: Number, default: 0 },
    pf: { type: Number, default: 0, min: 0 },
    esi: { type: Number, default: 0, min: 0 },
    pt: { type: Number, default: 0, min: 0 },
    tds: { type: Number, default: 0, min: 0 },
    lop: { type: Number, default: 0, min: 0 },
  },
  baseSchemaOptions,
);

// All entries for a run (detail view) + per-employee lookups.
PayrollEntrySchema.index({ companyId: 1, runId: 1, isDeleted: 1 });
PayrollEntrySchema.index({ companyId: 1, employeeId: 1 });

export const PayrollEntry: Model<PayrollEntryDoc> =
  (models.PayrollEntry as Model<PayrollEntryDoc>) ??
  model<PayrollEntryDoc>('PayrollEntry', PayrollEntrySchema);
