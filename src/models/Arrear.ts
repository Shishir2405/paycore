/**
 * Arrear — a retroactive pay adjustment owed to an employee (e.g. a back-dated
 * increment). Created Pending; payroll picks up Pending arrears for the cycle and
 * marks them Processed once paid out, so the same arrear is never paid twice.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const ARREAR_STATUSES = ['Pending', 'Processed'] as const;
export type ArrearStatus = (typeof ARREAR_STATUSES)[number];

export type ArrearDoc = WithBase<{
  employeeId: Types.ObjectId;
  /** Payroll month this arrear should be paid in, 1-12. */
  month: number;
  year: number;
  amount: number;
  reason: string;
  status: ArrearStatus;
}>;

const ArrearSchema = new Schema<ArrearDoc>(
  {
    ...baseFields,

    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 2000 },
    amount: { type: Number, required: true, default: 0, min: 0 },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ARREAR_STATUSES, default: 'Pending', index: true },
  },
  baseSchemaOptions,
);

// Engine query: pending arrears for an employee in a cycle.
ArrearSchema.index({ companyId: 1, employeeId: 1, year: 1, month: 1, status: 1 });

export const Arrear: Model<ArrearDoc> =
  (models.Arrear as Model<ArrearDoc>) ?? model<ArrearDoc>('Arrear', ArrearSchema);
