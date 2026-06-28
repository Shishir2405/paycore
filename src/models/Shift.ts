/**
 * Shift master — a named working window with break time and weekly-off days.
 * Used by attendance to compute overtime (hours worked beyond the shift span)
 * and to flag weekly-offs. Times are stored as "HH:mm" strings so they are
 * timezone-agnostic and easy to render; the service does the arithmetic.
 */
import { Schema, model, models, type Model } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export type ShiftDoc = WithBase<{
  name: string;
  code: string;
  /** Start of the shift, "HH:mm" 24h. */
  startTime: string;
  /** End of the shift, "HH:mm" 24h. May be < startTime for night shifts. */
  endTime: string;
  /** Unpaid break minutes deducted from the shift span. */
  breakMinutes: number;
  /** Days that are weekly-offs: 0=Sunday … 6=Saturday. */
  weeklyOffDays: number[];
  isActive: boolean;
}>;

const ShiftSchema = new Schema<ShiftDoc>(
  {
    ...baseFields,
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    startTime: { type: String, required: true, trim: true, default: '09:00' },
    endTime: { type: String, required: true, trim: true, default: '18:00' },
    breakMinutes: { type: Number, default: 60, min: 0 },
    weeklyOffDays: { type: [Number], default: [0] },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

// Unique shift code per tenant; supporting filter index.
ShiftSchema.index({ companyId: 1, code: 1 }, { unique: true });
ShiftSchema.index({ companyId: 1, isActive: 1, isDeleted: 1 });

export const Shift: Model<ShiftDoc> =
  (models.Shift as Model<ShiftDoc>) ?? model<ShiftDoc>('Shift', ShiftSchema);
