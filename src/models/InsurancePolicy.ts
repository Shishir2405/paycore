/**
 * Employee insurance policy (group health / term / personal-accident). The monthly
 * premium feeds the deductions side of payroll; sum insured is informational.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export type InsurancePolicyDoc = WithBase<{
  employeeId: Types.ObjectId;
  policyNo: string;
  provider: string;
  sumInsured: number;
  premiumMonthly: number;
  isActive: boolean;
}>;

const InsurancePolicySchema = new Schema<InsurancePolicyDoc>(
  {
    ...baseFields,
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    policyNo: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    sumInsured: { type: Number, required: true, min: 0, default: 0 },
    premiumMonthly: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

InsurancePolicySchema.index({ companyId: 1, policyNo: 1 }, { unique: true });
InsurancePolicySchema.index({ companyId: 1, employeeId: 1 });

export const InsurancePolicy: Model<InsurancePolicyDoc> =
  (models.InsurancePolicy as Model<InsurancePolicyDoc>) ??
  model<InsurancePolicyDoc>('InsurancePolicy', InsurancePolicySchema);
