/**
 * Shared schema building blocks. Every collection mixes in `baseFields` so it
 * carries multi-tenant scoping (`companyId`), audit columns (`createdBy`/
 * `updatedBy`), a soft-delete flag, an extensible `metadata` bag, and timestamps.
 *
 * The reusable sub-schemas (Address, EmergencyContact, Money) are defined here so
 * every module shares one shape — change an address field once and it propagates.
 */
import { Schema, type Types } from 'mongoose';

export const baseFields = {
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false, index: true },
  /**
   * Tenant-specific custom fields without a migration. Keeps the schema scalable:
   * a company can attach extra attributes (e.g. a custom "bus route") to any
   * record and the report builder can surface them. Use a function default so
   * the empty object is never shared across documents.
   */
  metadata: { type: Schema.Types.Mixed, default: () => ({}) },
} as const;

export type WithBase<T> = T & {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  isDeleted: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

/** Standard schema options: timestamps on, lean-friendly JSON transform. */
export const baseSchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(_doc: unknown, ret: Record<string, unknown>) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: { virtuals: true },
} as const;

// ─── Reusable embedded sub-schemas ──────────────────────────────────────────

export type Address = {
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  state?: string;
  /** GST state code (e.g. "27" for Maharashtra) — used by statutory exports. */
  stateCode?: string;
  country: string;
  pincode?: string;
  landmark?: string;
};

export const AddressSchema = new Schema<Address>(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },
    stateCode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'India' },
    pincode: { type: String, trim: true },
    landmark: { type: String, trim: true },
  },
  { _id: false },
);

export type EmergencyContact = {
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
};

export const EmergencyContactSchema = new Schema<EmergencyContact>(
  {
    name: { type: String, required: true, trim: true },
    relationship: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: false },
);

/** Money is stored as a plain number (INR, 2dp) + currency for forward-compat. */
export type Money = { amount: number; currency: string };

export const MoneySchema = new Schema<Money>(
  {
    amount: { type: Number, required: true, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
  },
  { _id: false },
);
