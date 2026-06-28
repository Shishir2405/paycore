/**
 * Ad-hoc or recurring salary deduction (e.g. canteen, parking, society fund).
 * A `recurring` deduction applies every cycle; a one-off applies only to its
 * `month` ("YYYY-MM"). Statutory deductions (PF/ESI/PT) are handled elsewhere.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export type DeductionDoc = WithBase<{
  employeeId: Types.ObjectId;
  name: string;
  amount: number;
  recurring: boolean;
  /** Applicable month "YYYY-MM" for one-off deductions; start month if recurring. */
  month: string;
  isActive: boolean;
}>;

const DeductionSchema = new Schema<DeductionDoc>(
  {
    ...baseFields,
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    recurring: { type: Boolean, default: false },
    month: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

DeductionSchema.index({ companyId: 1, employeeId: 1, month: 1 });
DeductionSchema.index({ companyId: 1, recurring: 1, isDeleted: 1 });

export const Deduction: Model<DeductionDoc> =
  (models.Deduction as Model<DeductionDoc>) ?? model<DeductionDoc>('Deduction', DeductionSchema);
