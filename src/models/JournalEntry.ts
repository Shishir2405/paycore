/**
 * Double-entry journal voucher — the bridge between payroll and the company's
 * accounting system (Tally / generic ledger). Each entry holds balanced
 * debit/credit lines; lines optionally carry a `costCenterId` so spend can be
 * sliced by dimension. Generated automatically from a payroll run (`source`
 * "Payroll", with `payrollRunId`) or keyed in manually.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const JOURNAL_SOURCES = ['Payroll', 'Manual'] as const;
export type JournalSource = (typeof JOURNAL_SOURCES)[number];

export type JournalLine = {
  /** Ledger account name as it appears in the target accounting system. */
  account: string;
  debit: number;
  credit: number;
  costCenterId?: Types.ObjectId | null;
  narration?: string;
};

export type JournalEntryDoc = WithBase<{
  /** Per-tenant running voucher number, e.g. JV-0001. */
  voucherNo: string;
  date: Date;
  narration: string;
  source: JournalSource;
  payrollRunId?: Types.ObjectId | null;
  lines: JournalLine[];
  /** Convenience totals (kept in sync by the service on write). */
  totalDebit: number;
  totalCredit: number;
}>;

const JournalLineSchema = new Schema<JournalLine>(
  {
    account: { type: String, required: true, trim: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    costCenterId: { type: Schema.Types.ObjectId, ref: 'CostCenter', default: null },
    narration: { type: String, trim: true },
  },
  { _id: false },
);

const JournalEntrySchema = new Schema<JournalEntryDoc>(
  {
    ...baseFields,
    voucherNo: { type: String, required: true, trim: true, uppercase: true },
    date: { type: Date, required: true },
    narration: { type: String, required: true, trim: true },
    source: { type: String, enum: JOURNAL_SOURCES, default: 'Manual', index: true },
    payrollRunId: { type: Schema.Types.ObjectId, ref: 'PayrollRun', default: null, index: true },
    lines: { type: [JournalLineSchema], default: [] },
    totalDebit: { type: Number, default: 0, min: 0 },
    totalCredit: { type: Number, default: 0, min: 0 },
  },
  baseSchemaOptions,
);

// Unique voucher number per tenant + common list filters.
JournalEntrySchema.index({ companyId: 1, voucherNo: 1 }, { unique: true });
JournalEntrySchema.index({ companyId: 1, source: 1, date: -1, isDeleted: 1 });

export const JournalEntry: Model<JournalEntryDoc> =
  (models.JournalEntry as Model<JournalEntryDoc>) ??
  model<JournalEntryDoc>('JournalEntry', JournalEntrySchema);
