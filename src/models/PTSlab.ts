/**
 * Professional Tax slab — one row of a state's monthly PT table. Scoped per
 * tenant so each company can override the statutory defaults (or model special
 * cases like Maharashtra's February top-up via `month`).
 */
import { Schema, model, models, type Model } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const PT_FREQUENCIES = ['Monthly', 'Annual'] as const;
export type PtFrequencyEnum = (typeof PT_FREQUENCIES)[number];

export type PTSlabDoc = WithBase<{
  stateCode: string;
  fromAmount: number;
  /** null => "and above". */
  toAmount?: number | null;
  amount: number;
  frequency: PtFrequencyEnum;
  /** Optional 1-12 month override for month-specific slabs. */
  month?: number | null;
  isActive: boolean;
}>;

const PTSlabSchema = new Schema<PTSlabDoc>(
  {
    ...baseFields,
    stateCode: { type: String, required: true, trim: true, uppercase: true },
    fromAmount: { type: Number, required: true, min: 0, default: 0 },
    toAmount: { type: Number, default: null, min: 0 },
    amount: { type: Number, required: true, min: 0, default: 0 },
    frequency: { type: String, enum: PT_FREQUENCIES, default: 'Monthly' },
    month: { type: Number, default: null, min: 1, max: 12 },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

// Common query: all active slabs for a state, ordered by floor.
PTSlabSchema.index({ companyId: 1, stateCode: 1, fromAmount: 1 });

export const PTSlab: Model<PTSlabDoc> =
  (models.PTSlab as Model<PTSlabDoc>) ?? model<PTSlabDoc>('PTSlab', PTSlabSchema);
