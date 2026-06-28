/**
 * Per-employee, per-leave-type, per-year ledger. `entitled` is the granted quota
 * (+ carry-forward), `used` is consumed via approved requests, and `balance` is
 * the remaining available days. One row per (employee, leaveType, year).
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export type LeaveBalanceDoc = WithBase<{
  employeeId: Types.ObjectId;
  leaveTypeId: Types.ObjectId;
  year: number;
  entitled: number;
  used: number;
  balance: number;
}>;

const LeaveBalanceSchema = new Schema<LeaveBalanceDoc>(
  {
    ...baseFields,
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveTypeId: { type: Schema.Types.ObjectId, ref: 'LeaveType', required: true, index: true },
    year: { type: Number, required: true },
    entitled: { type: Number, default: 0, min: 0 },
    used: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: 0 },
  },
  baseSchemaOptions,
);

// One balance row per employee + type + year, scoped to the tenant.
LeaveBalanceSchema.index(
  { companyId: 1, employeeId: 1, leaveTypeId: 1, year: 1 },
  { unique: true },
);

export const LeaveBalance: Model<LeaveBalanceDoc> =
  (models.LeaveBalance as Model<LeaveBalanceDoc>) ??
  model<LeaveBalanceDoc>('LeaveBalance', LeaveBalanceSchema);
