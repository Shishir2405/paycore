/**
 * Employee investment / tax declaration for a financial year. Drives TDS by
 * capturing chapter VI-A and other deductions under each section. Sections grow
 * over time, so they're appended sub-documents; declared vs. proof amounts let
 * payroll verify what an employee actually substantiated. One declaration per
 * employee per financial year per tenant (enforced by a compound unique index).
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';
import { TAX_REGIMES, type TaxRegime } from './Employee';

export const TAX_DECLARATION_STATUSES = ['Draft', 'Submitted', 'Verified'] as const;
export type TaxDeclarationStatus = (typeof TAX_DECLARATION_STATUSES)[number];

export { TAX_REGIMES, type TaxRegime };

export type TaxDeclarationSection = {
  /** Income-tax section/sub-section, e.g. "80C", "80D", "24B". */
  code: string;
  label?: string;
  declaredAmount: number;
  proofAmount: number;
  verified: boolean;
};

export type TaxDeclarationDoc = WithBase<{
  employeeId: Types.ObjectId;
  /** India FY label, e.g. "2024-25". */
  financialYear: string;
  regime: TaxRegime;
  sections: TaxDeclarationSection[];
  submittedAt?: Date | null;
  status: TaxDeclarationStatus;
}>;

const TaxDeclarationSectionSchema = new Schema<TaxDeclarationSection>(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    label: { type: String, trim: true },
    declaredAmount: { type: Number, default: 0, min: 0 },
    proofAmount: { type: Number, default: 0, min: 0 },
    verified: { type: Boolean, default: false },
  },
  { _id: false },
);

const TaxDeclarationSchema = new Schema<TaxDeclarationDoc>(
  {
    ...baseFields,
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    financialYear: { type: String, required: true, trim: true },
    regime: { type: String, enum: TAX_REGIMES, default: 'New' },
    sections: { type: [TaxDeclarationSectionSchema], default: [] },
    submittedAt: { type: Date, default: null },
    status: { type: String, enum: TAX_DECLARATION_STATUSES, default: 'Draft', index: true },
  },
  baseSchemaOptions,
);

// One declaration per employee per FY per tenant; supporting list index.
TaxDeclarationSchema.index({ companyId: 1, employeeId: 1, financialYear: 1 }, { unique: true });
TaxDeclarationSchema.index({ companyId: 1, financialYear: 1, status: 1, isDeleted: 1 });

export const TaxDeclaration: Model<TaxDeclarationDoc> =
  (models.TaxDeclaration as Model<TaxDeclarationDoc>) ??
  model<TaxDeclarationDoc>('TaxDeclaration', TaxDeclarationSchema);
