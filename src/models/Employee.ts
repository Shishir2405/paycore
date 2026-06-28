/**
 * Employee master record — the spine of the whole system. Designed to scale:
 * sensitive identifiers (PAN, Aadhaar, bank account) are stored encrypted and
 * masked in API responses; growing lists (status / transfer history) are
 * appended, never overwritten; references are used for anything that itself
 * grows (salary structures, documents) so this document stays bounded.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import {
  baseFields,
  baseSchemaOptions,
  AddressSchema,
  EmergencyContactSchema,
  type Address,
  type EmergencyContact,
  type WithBase,
} from './_base';

export const EMPLOYEE_STATUSES = ['Active', 'Inactive', 'OnNotice', 'Exited', 'Onboarding'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const EMPLOYMENT_TYPES = ['FullTime', 'PartTime', 'Contract', 'Intern', 'Consultant'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const WORK_MODES = ['Onsite', 'Remote', 'Hybrid', 'Field'] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const TAX_REGIMES = ['Old', 'New'] as const;
export type TaxRegime = (typeof TAX_REGIMES)[number];

export const PAYMENT_MODES = ['Bank', 'Cash', 'Cheque', 'UPI'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const EXIT_TYPES = ['Resignation', 'Termination', 'Retirement', 'Absconding', 'EndOfContract', 'Deceased'] as const;
export type ExitType = (typeof EXIT_TYPES)[number];

type StatusHistoryEntry = {
  status: EmployeeStatus;
  effectiveDate: Date;
  reason?: string;
  changedBy?: Types.ObjectId | null;
};

type TransferHistoryEntry = {
  effectiveDate: Date;
  fromDepartmentId?: Types.ObjectId | null;
  toDepartmentId?: Types.ObjectId | null;
  fromDesignationId?: Types.ObjectId | null;
  toDesignationId?: Types.ObjectId | null;
  fromLocation?: string;
  toLocation?: string;
  reason?: string;
  changedBy?: Types.ObjectId | null;
};

export type EmployeeDoc = WithBase<{
  // ── Identity ──────────────────────────────────────────────────────────────
  employeeCode: string;
  /** Optional biometric / attendance-device id used by import matching. */
  attendanceId?: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  personalEmail?: string;
  phone?: string;
  alternatePhone?: string;
  profilePhotoUrl?: string;

  // ── Personal ──────────────────────────────────────────────────────────────
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: Date;
  bloodGroup?: string;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  physicallyChallenged?: boolean;
  currentAddress?: Address;
  permanentAddress?: Address;
  emergencyContacts: EmergencyContact[];

  // ── Employment ──────────────────────────────────────────────────────────────
  dateOfJoining: Date;
  dateOfConfirmation?: Date | null;
  dateOfExit?: Date | null;
  employmentType: EmploymentType;
  workMode: WorkMode;
  noticePeriodDays?: number;
  departmentId?: Types.ObjectId | null;
  designationId?: Types.ObjectId | null;
  gradeId?: Types.ObjectId | null;
  reportingManagerId?: Types.ObjectId | null;
  costCenterId?: Types.ObjectId | null;
  shiftId?: Types.ObjectId | null;
  locationName?: string;

  // ── Statutory identifiers (encrypted at rest) + applicability ───────────────
  panEnc?: string;
  aadhaarEnc?: string;
  uan?: string;
  pfNumber?: string;
  esicNumber?: string;
  /** PRAN — National Pension System account, if opted in. */
  pran?: string;
  pfApplicable: boolean;
  esiApplicable: boolean;
  ptApplicable: boolean;
  lwfApplicable: boolean;

  // ── Banking (account number encrypted) ──────────────────────────────────────
  bank?: {
    accountNumberEnc?: string;
    ifsc?: string;
    bankName?: string;
    branchName?: string;
    accountHolderName?: string;
    accountType?: 'Savings' | 'Current';
    upiId?: string;
  };
  paymentMode: PaymentMode;

  // ── Compensation & tax ──────────────────────────────────────────────────────
  ctcAnnual?: number;
  /** Points at the active versioned salary structure (separate collection). */
  salaryStructureId?: Types.ObjectId | null;
  taxRegime: TaxRegime;

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  status: EmployeeStatus;
  statusHistory: StatusHistoryEntry[];
  transferHistory: TransferHistoryEntry[];
  probation?: { isOnProbation: boolean; endDate?: Date | null; confirmed?: boolean };
  onboarding?: { status: 'Pending' | 'InProgress' | 'Completed'; completedSteps: string[] };
  exit?: {
    lastWorkingDay?: Date | null;
    exitType?: ExitType;
    reason?: string;
    rehireEligible?: boolean;
    notes?: string;
    fnfSettled?: boolean;
  };
}>;

const StatusHistorySchema = new Schema<StatusHistoryEntry>(
  {
    status: { type: String, enum: EMPLOYEE_STATUSES, required: true },
    effectiveDate: { type: Date, required: true },
    reason: String,
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false },
);

const TransferHistorySchema = new Schema<TransferHistoryEntry>(
  {
    effectiveDate: { type: Date, required: true },
    fromDepartmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    toDepartmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    fromDesignationId: { type: Schema.Types.ObjectId, ref: 'Designation', default: null },
    toDesignationId: { type: Schema.Types.ObjectId, ref: 'Designation', default: null },
    fromLocation: String,
    toLocation: String,
    reason: String,
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false },
);

const EmployeeSchema = new Schema<EmployeeDoc>(
  {
    ...baseFields,

    employeeCode: { type: String, required: true, trim: true, uppercase: true },
    attendanceId: { type: String, trim: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    displayName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    personalEmail: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    alternatePhone: { type: String, trim: true },
    profilePhotoUrl: String,

    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    dateOfBirth: Date,
    bloodGroup: { type: String, trim: true },
    maritalStatus: { type: String, enum: MARITAL_STATUSES },
    nationality: { type: String, trim: true, default: 'Indian' },
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    spouseName: { type: String, trim: true },
    physicallyChallenged: { type: Boolean, default: false },
    currentAddress: { type: AddressSchema, default: undefined },
    permanentAddress: { type: AddressSchema, default: undefined },
    emergencyContacts: { type: [EmergencyContactSchema], default: [] },

    dateOfJoining: { type: Date, required: true },
    dateOfConfirmation: { type: Date, default: null },
    dateOfExit: { type: Date, default: null },
    employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: 'FullTime' },
    workMode: { type: String, enum: WORK_MODES, default: 'Onsite' },
    noticePeriodDays: { type: Number, default: 30, min: 0 },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    designationId: { type: Schema.Types.ObjectId, ref: 'Designation', default: null, index: true },
    gradeId: { type: Schema.Types.ObjectId, ref: 'Designation', default: null },
    reportingManagerId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
    costCenterId: { type: Schema.Types.ObjectId, ref: 'CostCenter', default: null },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Shift', default: null },
    locationName: String,

    panEnc: { type: String, select: false },
    aadhaarEnc: { type: String, select: false },
    uan: { type: String, trim: true },
    pfNumber: { type: String, trim: true },
    esicNumber: { type: String, trim: true },
    pran: { type: String, trim: true },
    pfApplicable: { type: Boolean, default: true },
    esiApplicable: { type: Boolean, default: false },
    ptApplicable: { type: Boolean, default: true },
    lwfApplicable: { type: Boolean, default: true },

    bank: {
      accountNumberEnc: { type: String, select: false },
      ifsc: { type: String, trim: true, uppercase: true },
      bankName: { type: String, trim: true },
      branchName: { type: String, trim: true },
      accountHolderName: { type: String, trim: true },
      accountType: { type: String, enum: ['Savings', 'Current'], default: 'Savings' },
      upiId: { type: String, trim: true },
    },
    paymentMode: { type: String, enum: PAYMENT_MODES, default: 'Bank' },

    ctcAnnual: { type: Number, min: 0 },
    salaryStructureId: { type: Schema.Types.ObjectId, ref: 'SalaryStructure', default: null },
    taxRegime: { type: String, enum: TAX_REGIMES, default: 'New' },

    status: { type: String, enum: EMPLOYEE_STATUSES, default: 'Active', index: true },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    transferHistory: { type: [TransferHistorySchema], default: [] },
    probation: {
      isOnProbation: { type: Boolean, default: false },
      endDate: { type: Date, default: null },
      confirmed: { type: Boolean, default: false },
    },
    onboarding: {
      status: { type: String, enum: ['Pending', 'InProgress', 'Completed'], default: 'Pending' },
      completedSteps: { type: [String], default: [] },
    },
    exit: {
      lastWorkingDay: { type: Date, default: null },
      exitType: { type: String, enum: EXIT_TYPES },
      reason: String,
      rehireEligible: { type: Boolean, default: true },
      notes: String,
      fnfSettled: { type: Boolean, default: false },
    },
  },
  baseSchemaOptions,
);

// Unique employee code per tenant; supporting indexes for the common filters.
EmployeeSchema.index({ companyId: 1, employeeCode: 1 }, { unique: true });
EmployeeSchema.index({ companyId: 1, status: 1, isDeleted: 1 });
EmployeeSchema.index({ companyId: 1, departmentId: 1 });
EmployeeSchema.index({ companyId: 1, email: 1 });
EmployeeSchema.index({ companyId: 1, uan: 1 });
// Text index powers debounced name/email search on the list view.
EmployeeSchema.index({ firstName: 'text', lastName: 'text', displayName: 'text', email: 'text' });

// Convenience virtual for display.
EmployeeSchema.virtual('fullName').get(function (this: EmployeeDoc) {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});

export const Employee: Model<EmployeeDoc> =
  (models.Employee as Model<EmployeeDoc>) ?? model<EmployeeDoc>('Employee', EmployeeSchema);
