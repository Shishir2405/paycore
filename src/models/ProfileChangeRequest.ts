/**
 * A personal-detail change request raised by an employee from the ESS portal.
 * Holds the requested patch (a sparse map of field → new value) and moves
 * through a Pending → Approved/Rejected lifecycle. On approval an admin applies
 * the change to the Employee master; this record is the audit-friendly request.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const PROFILE_CHANGE_STATUSES = ['Pending', 'Approved', 'Rejected'] as const;
export type ProfileChangeStatus = (typeof PROFILE_CHANGE_STATUSES)[number];

/** Fields an employee is allowed to self-request changes to. */
export const PROFILE_CHANGE_FIELDS = [
  'phone',
  'personalEmail',
  'currentAddress',
  'emergencyContact',
  'bankAccount',
] as const;
export type ProfileChangeField = (typeof PROFILE_CHANGE_FIELDS)[number];

export type ProfileChangeRequestDoc = WithBase<{
  employeeId: Types.ObjectId;
  field: ProfileChangeField;
  /** New value as submitted by the employee (string for simple fields). */
  newValue: string;
  reason?: string;
  status: ProfileChangeStatus;
  reviewerId?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  reviewNote?: string;
}>;

const ProfileChangeRequestSchema = new Schema<ProfileChangeRequestDoc>(
  {
    ...baseFields,
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    field: { type: String, enum: PROFILE_CHANGE_FIELDS, required: true },
    newValue: { type: String, required: true, trim: true },
    reason: { type: String, trim: true },
    status: { type: String, enum: PROFILE_CHANGE_STATUSES, default: 'Pending', index: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, trim: true },
  },
  baseSchemaOptions,
);

ProfileChangeRequestSchema.index({ companyId: 1, employeeId: 1, createdAt: -1 });
ProfileChangeRequestSchema.index({ companyId: 1, status: 1, isDeleted: 1 });

export const ProfileChangeRequest: Model<ProfileChangeRequestDoc> =
  (models.ProfileChangeRequest as Model<ProfileChangeRequestDoc>) ??
  model<ProfileChangeRequestDoc>('ProfileChangeRequest', ProfileChangeRequestSchema);
