/**
 * Tenant root. Every other collection scopes to a `companyId` pointing here.
 * Carries registration/statutory establishment details, disbursement bank
 * accounts, authorised signatories (for Form 16 / letters), and a subscription
 * block so the same deployment can serve many companies (multi-tenant SaaS).
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { AddressSchema, type Address } from './_base';

export const SUBSCRIPTION_PLANS = ['trial', 'starter', 'growth', 'enterprise'] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

type CompanyLocation = {
  name: string;
  code?: string;
  address?: Address;
  gstin?: string;
  /** State code drives PT / LWF rule selection for employees at this location. */
  stateCode?: string;
  contactPhone?: string;
  isHeadOffice: boolean;
  isActive: boolean;
};

type CompanyBankAccount = {
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch?: string;
  /** Format hint for the bank transfer file generator. */
  transferFormat?: string;
  isPrimary: boolean;
};

type Signatory = {
  name: string;
  designation?: string;
  /** Which documents this person signs, e.g. ["form16", "offerLetter"]. */
  forDocuments: string[];
  signatureUrl?: string;
};

export type CompanyDoc = {
  _id: Types.ObjectId;
  name: string;
  legalName?: string;
  brandName?: string;
  industry?: string;
  registrationNumber?: string;
  cin?: string;
  dateOfIncorporation?: Date;
  website?: string;

  // Statutory registrations
  pan?: string;
  tan?: string;
  gstin?: string;
  pfEstablishmentId?: string;
  esiEstablishmentId?: string;
  ptRegistrationNumber?: string;
  lwfRegistrationNumber?: string;

  contact?: { email?: string; phone?: string; hrEmail?: string };
  registeredAddress?: Address;
  locations: CompanyLocation[];
  bankAccounts: CompanyBankAccount[];
  signatories: Signatory[];

  // Fiscal config
  financialYearStartMonth: number; // 1-12 (India = 4 / April)
  currency: string;

  logoUrl?: string;
  isActive: boolean;

  subscription: {
    plan: SubscriptionPlan;
    status: 'active' | 'trialing' | 'past_due' | 'cancelled';
    seats: number;
    employeeLimit: number;
    trialEndsAt?: Date | null;
    renewsAt?: Date | null;
  };

  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

const LocationSchema = new Schema<CompanyLocation>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    address: { type: AddressSchema, default: undefined },
    gstin: { type: String, trim: true, uppercase: true },
    stateCode: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    isHeadOffice: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

const BankAccountSchema = new Schema<CompanyBankAccount>(
  {
    bankName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    ifsc: { type: String, required: true, trim: true, uppercase: true },
    branch: { type: String, trim: true },
    transferFormat: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true },
);

const SignatorySchema = new Schema<Signatory>(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, trim: true },
    forDocuments: { type: [String], default: [] },
    signatureUrl: String,
  },
  { _id: true },
);

const CompanySchema = new Schema<CompanyDoc>(
  {
    name: { type: String, required: true, trim: true },
    legalName: { type: String, trim: true },
    brandName: { type: String, trim: true },
    industry: { type: String, trim: true },
    registrationNumber: { type: String, trim: true },
    cin: { type: String, trim: true, uppercase: true },
    dateOfIncorporation: Date,
    website: { type: String, trim: true },

    pan: { type: String, trim: true, uppercase: true },
    tan: { type: String, trim: true, uppercase: true },
    gstin: { type: String, trim: true, uppercase: true },
    pfEstablishmentId: { type: String, trim: true },
    esiEstablishmentId: { type: String, trim: true },
    ptRegistrationNumber: { type: String, trim: true },
    lwfRegistrationNumber: { type: String, trim: true },

    contact: {
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      hrEmail: { type: String, trim: true, lowercase: true },
    },
    registeredAddress: { type: AddressSchema, default: undefined },
    locations: { type: [LocationSchema], default: [] },
    bankAccounts: { type: [BankAccountSchema], default: [] },
    signatories: { type: [SignatorySchema], default: [] },

    financialYearStartMonth: { type: Number, default: 4, min: 1, max: 12 },
    currency: { type: String, default: 'INR' },

    logoUrl: String,
    isActive: { type: Boolean, default: true },

    subscription: {
      plan: { type: String, enum: SUBSCRIPTION_PLANS, default: 'trial' },
      status: {
        type: String,
        enum: ['active', 'trialing', 'past_due', 'cancelled'],
        default: 'trialing',
      },
      seats: { type: Number, default: 5, min: 1 },
      employeeLimit: { type: Number, default: 25, min: 1 },
      trialEndsAt: { type: Date, default: null },
      renewsAt: { type: Date, default: null },
    },

    metadata: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

export const Company: Model<CompanyDoc> =
  (models.Company as Model<CompanyDoc>) ?? model<CompanyDoc>('Company', CompanySchema);
