/** Org unit. Self-referential `parentId` supports an arbitrary-depth hierarchy. */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export type DepartmentDoc = WithBase<{
  name: string;
  code: string;
  description?: string;
  parentId?: Types.ObjectId | null;
  headEmployeeId?: Types.ObjectId | null;
  costCenterId?: Types.ObjectId | null;
  /** Materialized ancestor path ("/eng/platform") for fast subtree queries. */
  path?: string;
  budgetAnnual?: number;
  isActive: boolean;
}>;

const DepartmentSchema = new Schema<DepartmentDoc>(
  {
    ...baseFields,
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    headEmployeeId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    costCenterId: { type: Schema.Types.ObjectId, ref: 'CostCenter', default: null },
    path: { type: String, trim: true },
    budgetAnnual: { type: Number, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  baseSchemaOptions,
);

DepartmentSchema.index({ companyId: 1, code: 1 }, { unique: true });

export const Department: Model<DepartmentDoc> =
  (models.Department as Model<DepartmentDoc>) ?? model<DepartmentDoc>('Department', DepartmentSchema);
