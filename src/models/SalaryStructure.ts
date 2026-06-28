/**
 * Salary Structure — a versioned, per-employee compensation snapshot. The payroll
 * engine reads the latest active structure for an employee and evaluates its heads
 * to produce a payslip. Versions are immutable history: creating a new active
 * version deactivates the previous one (handled in the service), so a structure
 * row always reflects what was in effect from `effectiveFrom`.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';
import { PAY_HEAD_TYPES, type PayHeadType } from './PayHead';

export type StructureHead = {
  /** Optional link back to the source PayHead (null for ad-hoc heads). */
  payHeadId?: Types.ObjectId | null;
  /** Stable code (uppercase) used by formulas, e.g. "HRA". */
  code: string;
  name: string;
  type: PayHeadType;
  /** Resolved monthly amount for this head (already evaluated/locked-in). */
  amount: number;
};

export type SalaryStructureDoc = WithBase<{
  employeeId: Types.ObjectId;
  /** Date this version takes effect. */
  effectiveFrom: Date;
  /** Monotonic version number per employee (1, 2, 3 …). */
  version: number;
  /** Only one active version per employee at a time. */
  isActive: boolean;
  /** Basic pay — the anchor for percent-of-basic heads + PF wage. */
  basic: number;
  heads: StructureHead[];
  /** Sum of earning heads (incl. basic). */
  gross: number;
  /** Cost to company (annualized gross + employer contributions). */
  ctc: number;
}>;

const StructureHeadSchema = new Schema<StructureHead>(
  {
    payHeadId: { type: Schema.Types.ObjectId, ref: 'PayHead', default: null },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: PAY_HEAD_TYPES, required: true },
    amount: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false },
);

const SalaryStructureSchema = new Schema<SalaryStructureDoc>(
  {
    ...baseFields,

    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    effectiveFrom: { type: Date, required: true },
    version: { type: Number, required: true, default: 1, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
    basic: { type: Number, required: true, default: 0, min: 0 },
    heads: { type: [StructureHeadSchema], default: [] },
    gross: { type: Number, default: 0, min: 0 },
    ctc: { type: Number, default: 0, min: 0 },
  },
  baseSchemaOptions,
);

// Common query: the active structure for an employee (engine + UI).
SalaryStructureSchema.index({ companyId: 1, employeeId: 1, isActive: 1, isDeleted: 1 });
SalaryStructureSchema.index({ companyId: 1, employeeId: 1, version: -1 });

export const SalaryStructure: Model<SalaryStructureDoc> =
  (models.SalaryStructure as Model<SalaryStructureDoc>) ??
  model<SalaryStructureDoc>('SalaryStructure', SalaryStructureSchema);
