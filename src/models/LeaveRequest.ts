/**
 * A leave application by an employee against a LeaveType. Moves through a
 * Pending → Approved/Rejected/Cancelled lifecycle; on approval the matching
 * LeaveBalance.used is incremented by the service layer.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const LEAVE_REQUEST_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'] as const;
export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number];

export type LeaveRequestDoc = WithBase<{
  employeeId: Types.ObjectId;
  leaveTypeId: Types.ObjectId;
  fromDate: Date;
  toDate: Date;
  /** Number of leave days requested (supports half-days as 0.5). */
  days: number;
  reason?: string;
  status: LeaveRequestStatus;
  approverId?: Types.ObjectId | null;
  decidedAt?: Date | null;
  decisionNote?: string;
}>;

const LeaveRequestSchema = new Schema<LeaveRequestDoc>(
  {
    ...baseFields,
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 0.5 },
    reason: { type: String, trim: true },
    status: { type: String, enum: LEAVE_REQUEST_STATUSES, default: 'Pending', index: true },
    approverId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, trim: true },
  },
  baseSchemaOptions,
);

LeaveRequestSchema.index({ companyId: 1, status: 1, isDeleted: 1 });
LeaveRequestSchema.index({ companyId: 1, employeeId: 1, fromDate: -1 });

export const LeaveRequest: Model<LeaveRequestDoc> =
  (models.LeaveRequest as Model<LeaveRequestDoc>) ??
  model<LeaveRequestDoc>('LeaveRequest', LeaveRequestSchema);
