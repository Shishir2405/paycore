/**
 * Bank disbursement file record — the salary-payout file a company uploads to
 * its bank's net-banking portal. One row per generated file; we store the
 * format, generated artifact URL, control totals (`totalAmount`, `recordCount`)
 * so the run can be reconciled, and the originating `payrollRunId`.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const BANK_FILE_FORMATS = ['NEFT', 'RTGS', 'Generic'] as const;
export type BankFileFormat = (typeof BANK_FILE_FORMATS)[number];

export type BankFileDoc = WithBase<{
  payrollRunId?: Types.ObjectId | null;
  format: BankFileFormat;
  generatedAt: Date;
  /** Public/storage URL of the generated text file (empty until uploaded). */
  fileUrl?: string;
  /** Original file name for download convenience. */
  fileName: string;
  totalAmount: number;
  recordCount: number;
}>;

const BankFileSchema = new Schema<BankFileDoc>(
  {
    ...baseFields,
    payrollRunId: { type: Schema.Types.ObjectId, ref: 'PayrollRun', default: null, index: true },
    format: { type: String, enum: BANK_FILE_FORMATS, default: 'NEFT', index: true },
    generatedAt: { type: Date, required: true, default: () => new Date() },
    fileUrl: { type: String, trim: true },
    fileName: { type: String, required: true, trim: true },
    totalAmount: { type: Number, default: 0, min: 0 },
    recordCount: { type: Number, default: 0, min: 0 },
  },
  baseSchemaOptions,
);

// Common list filters: by run, by format, most-recent first.
BankFileSchema.index({ companyId: 1, payrollRunId: 1 });
BankFileSchema.index({ companyId: 1, format: 1, generatedAt: -1, isDeleted: 1 });

export const BankFile: Model<BankFileDoc> =
  (models.BankFile as Model<BankFileDoc>) ?? model<BankFileDoc>('BankFile', BankFileSchema);
