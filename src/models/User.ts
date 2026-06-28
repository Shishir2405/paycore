/**
 * Login account. Distinct from `Employee` — not every user is an employee
 * (e.g. an external auditor) and not every employee has portal access yet.
 * When an employee is given ESS access, `employeeId` links the two.
 *
 * Carries the account-security surface (lockout, password lifecycle, MFA, token
 * rotation) and per-user preferences so the auth/ESS layers have what they need.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const USER_STATUSES = ['Active', 'Invited', 'Suspended', 'Disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export type UserDoc = WithBase<{
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  passwordHash: string;
  roleId: Types.ObjectId;
  /** Denormalized role name for fast token/context building. */
  roleName: string;
  employeeId?: Types.ObjectId | null;
  status: UserStatus;
  isActive: boolean;

  // Account security
  mustChangePassword: boolean;
  passwordChangedAt?: Date | null;
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  /** Refresh-token rotation: bump to invalidate all outstanding refresh tokens. */
  tokenVersion: number;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;

  // Invitation flow
  invitedBy?: Types.ObjectId | null;
  invitedAt?: Date | null;

  preferences: {
    locale: string;
    timezone: string;
    theme: 'system' | 'light' | 'dark';
    emailNotifications: boolean;
  };
}>;

const UserSchema = new Schema<UserDoc>(
  {
    ...baseFields,
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    avatarUrl: String,
    passwordHash: { type: String, required: true, select: false },
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    roleName: { type: String, required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    status: { type: String, enum: USER_STATUSES, default: 'Active', index: true },
    isActive: { type: Boolean, default: true },

    mustChangePassword: { type: Boolean, default: false },
    passwordChangedAt: { type: Date, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
    tokenVersion: { type: Number, default: 0 },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null, select: false },

    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    invitedAt: { type: Date, default: null },

    preferences: {
      locale: { type: String, default: 'en-IN' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
      emailNotifications: { type: Boolean, default: true },
    },
  },
  baseSchemaOptions,
);

// Email unique per company (multi-tenant: same email could exist in two tenants).
UserSchema.index({ companyId: 1, email: 1 }, { unique: true });
UserSchema.index({ companyId: 1, roleId: 1 });

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) ?? model<UserDoc>('User', UserSchema);
