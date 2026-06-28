/**
 * A supporting document uploaded against a single section of a tax declaration
 * (e.g. an 80C LIC receipt). Kept in its own collection so a declaration stays
 * bounded as proofs accumulate, and so each proof carries its own approval state.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const TAX_PROOF_STATUSES = ['Pending', 'Approved', 'Rejected'] as const;
export type TaxProofStatus = (typeof TAX_PROOF_STATUSES)[number];

export type TaxProofDoc = WithBase<{
  declarationId: Types.ObjectId;
  /** Mirrors a TaxDeclaration.sections[].code so proofs map to a section. */
  sectionCode: string;
  fileUrl: string;
  fileName?: string;
  status: TaxProofStatus;
  remarks?: string;
}>;

const TaxProofSchema = new Schema<TaxProofDoc>(
  {
    ...baseFields,
    declarationId: { type: Schema.Types.ObjectId, ref: 'TaxDeclaration', required: true, index: true },
    sectionCode: { type: String, required: true, trim: true, uppercase: true },
    fileUrl: { type: String, required: true, trim: true },
    fileName: { type: String, trim: true },
    status: { type: String, enum: TAX_PROOF_STATUSES, default: 'Pending', index: true },
    remarks: { type: String, trim: true },
  },
  baseSchemaOptions,
);

TaxProofSchema.index({ companyId: 1, declarationId: 1, sectionCode: 1 });

export const TaxProof: Model<TaxProofDoc> =
  (models.TaxProof as Model<TaxProofDoc>) ?? model<TaxProofDoc>('TaxProof', TaxProofSchema);
