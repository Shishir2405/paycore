/**
 * Compliance calendar entry — a single statutory filing/payment obligation
 * (PF challan, ESI, PT, LWF, TDS) for a given period with a due date and
 * filing status. Powers the compliance calendar / tracker.
 */
import { Schema, model, models, type Model } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const COMPLIANCE_TYPES = ['PF', 'ESI', 'PT', 'LWF', 'TDS'] as const;
export type ComplianceType = (typeof COMPLIANCE_TYPES)[number];

export const COMPLIANCE_STATUSES = ['Pending', 'Filed', 'Overdue'] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export type ComplianceItemDoc = WithBase<{
  type: ComplianceType;
  /** Filing period, e.g. "2026-06" (month) or "2026-Q1". */
  period: string;
  dueDate: Date;
  status: ComplianceStatus;
  /** Amount payable/filed (INR). */
  amount: number;
  /** Challan / acknowledgement reference once filed. */
  reference?: string;
  filedDate?: Date | null;
  notes?: string;
}>;

const ComplianceItemSchema = new Schema<ComplianceItemDoc>(
  {
    ...baseFields,
    type: { type: String, enum: COMPLIANCE_TYPES, required: true, index: true },
    period: { type: String, required: true, trim: true },
    dueDate: { type: Date, required: true, index: true },
    status: { type: String, enum: COMPLIANCE_STATUSES, default: 'Pending', index: true },
    amount: { type: Number, default: 0, min: 0 },
    reference: { type: String, trim: true },
    filedDate: { type: Date, default: null },
    notes: { type: String, trim: true },
  },
  baseSchemaOptions,
);

// One obligation per type+period per tenant; supports calendar sorting by due date.
ComplianceItemSchema.index({ companyId: 1, type: 1, period: 1 }, { unique: true });
ComplianceItemSchema.index({ companyId: 1, dueDate: 1, status: 1 });

export const ComplianceItem: Model<ComplianceItemDoc> =
  (models.ComplianceItem as Model<ComplianceItemDoc>) ??
  model<ComplianceItemDoc>('ComplianceItem', ComplianceItemSchema);
