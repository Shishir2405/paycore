/**
 * Pay Head — a single configurable component of a salary structure (an earning
 * like HRA / a deduction like PF). Pay heads are the building blocks the payroll
 * engine evaluates per employee. Each is tenant-scoped and soft-deletable, with a
 * unique `code` per company so formulas can reference one another as {CODE}.
 */
import { Schema, model, models, type Model } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const PAY_HEAD_TYPES = ['Earning', 'Deduction'] as const;
export type PayHeadType = (typeof PAY_HEAD_TYPES)[number];

export const PAY_HEAD_CALC_TYPES = ['Flat', 'PercentOfBasic', 'PercentOfGross', 'Formula'] as const;
export type PayHeadCalcType = (typeof PAY_HEAD_CALC_TYPES)[number];

export type PayHeadDoc = WithBase<{
  name: string;
  /** Stable per-tenant identifier referenced by formulas, e.g. "HRA". */
  code: string;
  type: PayHeadType;
  calcType: PayHeadCalcType;
  /** Flat amount, or the percentage when calcType is PercentOf*. */
  value: number;
  /** Arithmetic expression evaluated only when calcType === 'Formula'. */
  formula?: string;
  taxable: boolean;
  isStatutory: boolean;
  affectsPf: boolean;
  affectsEsi: boolean;
  /** Sort order on payslips and the structure builder (lower = earlier). */
  displayOrder: number;
  isActive: boolean;
}>;

const PayHeadSchema = new Schema<PayHeadDoc>(
  {
    ...baseFields,

    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    type: { type: String, enum: PAY_HEAD_TYPES, required: true, index: true },
    calcType: { type: String, enum: PAY_HEAD_CALC_TYPES, required: true, default: 'Flat' },
    value: { type: Number, default: 0, min: 0 },
    formula: { type: String, trim: true },
    taxable: { type: Boolean, default: true },
    isStatutory: { type: Boolean, default: false },
    affectsPf: { type: Boolean, default: false },
    affectsEsi: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  baseSchemaOptions,
);

// Unique pay-head code per tenant; supporting index for the grouped list view.
PayHeadSchema.index({ companyId: 1, code: 1 }, { unique: true });
PayHeadSchema.index({ companyId: 1, type: 1, displayOrder: 1, isDeleted: 1 });

export const PayHead: Model<PayHeadDoc> =
  (models.PayHead as Model<PayHeadDoc>) ?? model<PayHeadDoc>('PayHead', PayHeadSchema);
