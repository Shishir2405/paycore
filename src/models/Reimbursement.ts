/**
 * Employee expense reimbursement claim. Moves through a Pending → Approved/Rejected
 * workflow; approved claims are paid out (typically added to payroll earnings).
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const REIMBURSEMENT_TYPES = ['Travel', 'Medical', 'Other'] as const;
export type ReimbursementType = (typeof REIMBURSEMENT_TYPES)[number];

export const REIMBURSEMENT_STATUSES = ['Pending', 'Approved', 'Rejected'] as const;
export type ReimbursementStatus = (typeof REIMBURSEMENT_STATUSES)[number];

export type ReimbursementDoc = WithBase<{
  employeeId: Types.ObjectId;
  type: ReimbursementType;
  amount: number;
  date: Date;
  status: ReimbursementStatus;
  description?: string;
  receiptUrl?: string;
  /** Set when approved/rejected. */
  decidedBy?: Types.ObjectId | null;
  decidedAt?: Date | null;
  decisionNote?: string;
}>;

const ReimbursementSchema = new Schema<ReimbursementDoc>(
  {
    ...baseFields,
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    type: { type: String, enum: REIMBURSEMENT_TYPES, required: true, default: 'Other' },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    status: { type: String, enum: REIMBURSEMENT_STATUSES, default: 'Pending', index: true },
    description: { type: String, trim: true },
    receiptUrl: { type: String, trim: true },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, trim: true },
  },
  baseSchemaOptions,
);

ReimbursementSchema.index({ companyId: 1, employeeId: 1, status: 1 });
ReimbursementSchema.index({ companyId: 1, status: 1, isDeleted: 1 });

export const Reimbursement: Model<ReimbursementDoc> =
  (models.Reimbursement as Model<ReimbursementDoc>) ??
  model<ReimbursementDoc>('Reimbursement', ReimbursementSchema);
