/**
 * Final Settlement (Full & Final / FnF) — the closing reckoning when an employee
 * exits. Captures leave encashment, gratuity, and recoveries (notice shortfall,
 * other dues) netted into a single settlement amount, with its own approval
 * lifecycle. Tenant-scoped + soft-deletable.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const SETTLEMENT_STATUSES = ['Draft', 'Approved', 'Paid'] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export type FinalSettlementDoc = WithBase<{
  employeeId: Types.ObjectId;
  lastWorkingDay: Date;
  leaveEncashment: number;
  gratuity: number;
  /** Recovery for un-served notice period (subtracted). */
  noticeRecovery: number;
  /** Any other pending dues payable to the employee (added). */
  otherDues: number;
  /** leaveEncashment + gratuity + otherDues − noticeRecovery. */
  netSettlement: number;
  status: SettlementStatus;
  approvedAt?: Date | null;
  notes?: string;
}>;

const FinalSettlementSchema = new Schema<FinalSettlementDoc>(
  {
    ...baseFields,

    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    lastWorkingDay: { type: Date, required: true },
    leaveEncashment: { type: Number, default: 0, min: 0 },
    gratuity: { type: Number, default: 0, min: 0 },
    noticeRecovery: { type: Number, default: 0, min: 0 },
    otherDues: { type: Number, default: 0, min: 0 },
    netSettlement: { type: Number, default: 0 },
    status: { type: String, enum: SETTLEMENT_STATUSES, default: 'Draft', index: true },
    approvedAt: { type: Date, default: null },
    notes: { type: String, trim: true },
  },
  baseSchemaOptions,
);

// One settlement per employee exit; list/lookups by employee + status.
FinalSettlementSchema.index({ companyId: 1, employeeId: 1, isDeleted: 1 });
FinalSettlementSchema.index({ companyId: 1, status: 1, createdAt: -1 });

export const FinalSettlement: Model<FinalSettlementDoc> =
  (models.FinalSettlement as Model<FinalSettlementDoc>) ??
  model<FinalSettlementDoc>('FinalSettlement', FinalSettlementSchema);
