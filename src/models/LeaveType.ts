/**
 * Leave policy master — defines a category of leave (e.g. Casual, Sick, Earned)
 * with its annual quota and carry-forward rules. Per-tenant `code` is unique.
 */
import { Schema, model, models, type Model } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export type LeaveTypeDoc = WithBase<{
  name: string;
  code: string;
  description?: string;
  /** Days granted per employee per year. */
  annualQuota: number;
  /** Whether days taken are paid (vs leave-without-pay). */
  paid: boolean;
  /** Whether unused balance rolls into the next year. */
  carryForward: boolean;
  /** Cap on the number of days that may be carried forward. */
  maxCarryForward: number;
  isActive: boolean;
}>;

const LeaveTypeSchema = new Schema<LeaveTypeDoc>(
  {
    ...baseFields,
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    annualQuota: { type: Number, required: true, default: 0, min: 0 },
    paid: { type: Boolean, default: true },
    carryForward: { type: Boolean, default: false },
    maxCarryForward: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

LeaveTypeSchema.index({ companyId: 1, code: 1 }, { unique: true });

export const LeaveType: Model<LeaveTypeDoc> =
  (models.LeaveType as Model<LeaveTypeDoc>) ?? model<LeaveTypeDoc>('LeaveType', LeaveTypeSchema);
