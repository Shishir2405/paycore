/**
 * Labour Welfare Fund rule — per-state employee/employer amounts and the
 * calendar months in which the deduction is taken. One active rule per state
 * per tenant is the norm.
 */
import { Schema, model, models, type Model } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const LWF_FREQUENCIES = ['Monthly', 'HalfYearly', 'Annual'] as const;
export type LwfFrequencyEnum = (typeof LWF_FREQUENCIES)[number];

export type LWFRuleDoc = WithBase<{
  stateCode: string;
  employeeAmount: number;
  employerAmount: number;
  frequency: LwfFrequencyEnum;
  /** Calendar months (1-12) the deduction is taken, e.g. [6, 12]. */
  deductionMonths: number[];
  isActive: boolean;
}>;

const LWFRuleSchema = new Schema<LWFRuleDoc>(
  {
    ...baseFields,
    stateCode: { type: String, required: true, trim: true, uppercase: true },
    employeeAmount: { type: Number, required: true, min: 0, default: 0 },
    employerAmount: { type: Number, required: true, min: 0, default: 0 },
    frequency: { type: String, enum: LWF_FREQUENCIES, default: 'HalfYearly' },
    deductionMonths: { type: [Number], default: () => [6, 12] },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

// One rule per state per tenant.
LWFRuleSchema.index({ companyId: 1, stateCode: 1 }, { unique: true });

export const LWFRule: Model<LWFRuleDoc> =
  (models.LWFRule as Model<LWFRuleDoc>) ?? model<LWFRuleDoc>('LWFRule', LWFRuleSchema);
