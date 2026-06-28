/** Job title / grade. Grade + band drive salary-template defaults later. */
import { Schema, model, models, type Model } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export type DesignationDoc = WithBase<{
  name: string;
  code: string;
  description?: string;
  grade?: string;
  band?: string;
  /** Numeric rank for org-chart ordering and approval routing. */
  level: number;
  /** Indicative CTC band for this designation (annual, INR). */
  ctcRange?: { min?: number; max?: number };
  isActive: boolean;
}>;

const DesignationSchema = new Schema<DesignationDoc>(
  {
    ...baseFields,
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    grade: { type: String, trim: true },
    band: { type: String, trim: true },
    level: { type: Number, default: 0, index: true },
    ctcRange: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
    },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

DesignationSchema.index({ companyId: 1, code: 1 }, { unique: true });

export const Designation: Model<DesignationDoc> =
  (models.Designation as Model<DesignationDoc>) ??
  model<DesignationDoc>('Designation', DesignationSchema);
