/**
 * Cost Center master — the dimension finance uses to slice payroll spend by
 * department / project / location. Self-referential `parentId` builds a tree so
 * a company can nest cost centers (e.g. "Engineering" → "Platform"). Multi-tenant
 * and soft-deletable like every other collection.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export type CostCenterDoc = WithBase<{
  name: string;
  /** Unique short code per tenant, used in journal lines + bank file tagging. */
  code: string;
  description?: string;
  parentId?: Types.ObjectId | null;
  isActive: boolean;
}>;

const CostCenterSchema = new Schema<CostCenterDoc>(
  {
    ...baseFields,
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'CostCenter', default: null, index: true },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

// Unique cost-center code per tenant + common list filter support.
CostCenterSchema.index({ companyId: 1, code: 1 }, { unique: true });
CostCenterSchema.index({ companyId: 1, isActive: 1, isDeleted: 1 });

export const CostCenter: Model<CostCenterDoc> =
  (models.CostCenter as Model<CostCenterDoc>) ?? model<CostCenterDoc>('CostCenter', CostCenterSchema);
