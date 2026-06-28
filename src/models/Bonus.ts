/**
 * Bonus — a one-off payout to an employee, either Statutory (e.g. the annual
 * Payment of Bonus Act payout) or Discretionary (performance/festival). Tagged
 * with the payroll month it should be disbursed in.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const BONUS_TYPES = ['Statutory', 'Discretionary'] as const;
export type BonusType = (typeof BONUS_TYPES)[number];

export type BonusDoc = WithBase<{
  employeeId: Types.ObjectId;
  type: BonusType;
  amount: number;
  /** Payroll month this bonus is disbursed in, 1-12. */
  month: number;
  year: number;
  notes?: string;
}>;

const BonusSchema = new Schema<BonusDoc>(
  {
    ...baseFields,

    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    type: { type: String, enum: BONUS_TYPES, default: 'Discretionary', index: true },
    amount: { type: Number, required: true, default: 0, min: 0 },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true, min: 2000 },
    notes: { type: String, trim: true },
  },
  baseSchemaOptions,
);

// Engine query: bonuses for an employee in a cycle.
BonusSchema.index({ companyId: 1, employeeId: 1, year: 1, month: 1 });

export const Bonus: Model<BonusDoc> =
  (models.Bonus as Model<BonusDoc>) ?? model<BonusDoc>('Bonus', BonusSchema);
